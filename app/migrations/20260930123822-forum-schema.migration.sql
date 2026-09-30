-- forum schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('member', 'moderator');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  handle text not null unique,
  email text not null unique,
  passwordHash text not null,
  displayName text not null default '',
  bio text not null default '',
  location text not null default '',
  role userRole not null default 'member',
  avatarId uuid,
  lastDigestAt timestamptz
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

-- Avatars and images attached to posts. The hash is the cache key in the URL,
-- so Postgres keeps it in step with the bytes.
create table uploads (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid references users(id) on delete set null,
  name text not null,
  contentType text not null,
  size integer not null,
  data bytea not null,
  hash text generated always as (encode(sha256(data), 'hex')) stored
);

create trigger uploadsTouchUpdatedAt
  before update on uploads
  for each row execute function touchUpdatedAt();

alter table users
  add constraint usersAvatarIdFkey foreign key (avatarId) references uploads(id) on delete set null;

create table categories (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  description text not null,
  position integer not null default 0,
  hue integer not null default 60,
  allowsSolutions boolean not null default false
);

create trigger categoriesTouchUpdatedAt
  before update on categories
  for each row execute function touchUpdatedAt();

-- The list windows page on lastPostAt and the topic window on posts.createdAt.
-- A page cursor travels through the browser as a JavaScript Date, which holds
-- milliseconds, so the sort columns store milliseconds too. At microseconds
-- the cursor rounds down and the next page repeats the row it ended on.
create table topics (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz(3) not null default now(),
  updatedAt timestamptz not null default now(),
  categoryId uuid not null references categories(id),
  userId uuid not null references users(id) on delete cascade,
  title text not null,
  excerpt text not null default '',
  pinned boolean not null default false,
  locked boolean not null default false,
  replyCount integer not null default 0,
  likeCount integer not null default 0,
  lastPostAt timestamptz(3) not null default now(),
  lastPostUserId uuid references users(id) on delete set null,
  solutionPostId uuid,
  unanswered boolean generated always as (replyCount = 0 and solutionPostId is null) stored
);

create index topicsLastPostAtIdx on topics (lastPostAt desc, id desc);
create index topicsCategoryLastPostAtIdx on topics (categoryId, lastPostAt desc, id desc);

create trigger topicsTouchUpdatedAt
  before update on topics
  for each row execute function touchUpdatedAt();

create table posts (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz(3) not null default now(),
  updatedAt timestamptz not null default now(),
  topicId uuid not null references topics(id) on delete cascade,
  userId uuid not null references users(id) on delete cascade,
  body text not null,
  isFirst boolean not null default false,
  quotePostId uuid references posts(id) on delete set null,
  isSolution boolean not null default false,
  hidden boolean not null default false
);

create index postsTopicCreatedAtIdx on posts (topicId, createdAt, id);
create index postsCreatedAtIdx on posts (createdAt);

create trigger postsTouchUpdatedAt
  before update on posts
  for each row execute function touchUpdatedAt();

alter table topics
  add constraint topicsSolutionPostIdFkey foreign key (solutionPostId) references posts(id) on delete set null;

create table postLikes (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  postId uuid not null references posts(id) on delete cascade,
  topicId uuid not null references topics(id) on delete cascade,
  userId uuid not null references users(id) on delete cascade,
  unique (postId, userId)
);

create trigger postLikesTouchUpdatedAt
  before update on postLikes
  for each row execute function touchUpdatedAt();

create table follows (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  topicId uuid not null references topics(id) on delete cascade,
  userId uuid not null references users(id) on delete cascade,
  unique (topicId, userId)
);

create trigger followsTouchUpdatedAt
  before update on follows
  for each row execute function touchUpdatedAt();

-- A reply bumps its topic. The topic's own trigger then tells every open list.
create or replace function postsBumpTopic() returns trigger
language plpgsql as $$
begin
  if not new.isFirst then
    update topics
       set replyCount = replyCount + 1,
           lastPostAt = greatest(lastPostAt, new.createdAt),
           lastPostUserId = new.userId
     where id = new.topicId;
  end if;

  return new;
end;
$$;

create trigger postsBumpTopicTrigger
  after insert on posts
  for each row execute function postsBumpTopic();

create or replace function postLikesCountTopic() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update topics set likeCount = likeCount + 1 where id = new.topicId;
  else
    update topics set likeCount = greatest(likeCount - 1, 0) where id = old.topicId;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger postLikesCountTopicTrigger
  after insert or delete on postLikes
  for each row execute function postLikesCountTopic();

-- Topic lists are LiveTable windows opened whole, per category, and on the
-- unanswered and pinned partitions. Every write to a topic, from any path,
-- notifies the table's channel, and each app server sends it to the lists
-- whose partition the row matches. The payload is the id alone, so each app
-- server reads the row back through the list's own select, joins included. A
-- row that leaves a partition (moved category, first reply) is a delete there.
create or replace function topicsNotify() returns trigger
language plpgsql as $$
declare
  r record;
begin
  r := coalesce(new, old);

  perform pg_notify(
    channel_name('topics'),
    json_build_object('op', lower(tg_op), 'id', r.id)::text
  );

  return r;
end;
$$;

create trigger topicsNotifyTrigger
  after insert or update or delete on topics
  for each row execute function topicsNotify();

-- Marking a solution clears the old one in the same statement batch, and a
-- moderator hiding a post is a plain update, so post changes notify too.
create or replace function postsNotify() returns trigger
language plpgsql as $$
declare
  r record;
begin
  r := coalesce(new, old);

  perform pg_notify(
    channel_name('posts'),
    json_build_object('op', lower(tg_op), 'id', r.id)::text
  );

  return r;
end;
$$;

create trigger postsNotifyTrigger
  after update or delete on posts
  for each row execute function postsNotify();
