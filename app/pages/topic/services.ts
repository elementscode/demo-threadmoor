import {
  LiveTable,
  sql,
  tx,
  session,
  AuthError,
  ForbiddenError,
  ValidationError,
} from "@elements/app";
import { isModerator, isModeratorOrThrow } from "#app/shared/services/auth";
import { plainText } from "#app/shared/services/markdown";
import { uuidOrThrow } from "#app/shared/services/forum";

export const POST_PAGE = 20;

export const MAX_BODY = 20000;

export interface PostRow {
  id: string;
  topicId: string;
  userId: string;
  body: string;
  isFirst: boolean;
  isSolution: boolean;
  hidden: boolean;
  createdAt: Date;
  quotePostId: string | null;
  authorHandle: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsModerator: boolean;
  quoteHandle: string | null;
  quoteExcerpt: string | null;
}

export interface PostLike {
  id: string;
  postId: string;
  topicId: string;
  userId: string;
}

export interface TopicDetail {
  id: string;
  title: string;
  userId: string;
  authorHandle: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categoryHue: number;
  allowsSolutions: boolean;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  likeCount: number;
  createdAt: Date;
  solutionPostId: string | null;
}

export interface SolutionSummary {
  id: string;
  handle: string;
  excerpt: string;
}

// A hidden post's body never leaves the database: every reader, moderators
// included, gets the placeholder, and unhiding brings the text back.
const POST_COLUMNS = sql.raw(`
  p.id, p.topicId, p.userId,
  case when p.hidden then '' else p.body end as body,
  p.isFirst, p.isSolution, p.hidden, p.createdAt, p.quotePostId,
  u.handle as authorHandle,
  coalesce(nullif(u.displayName, ''), u.handle) as authorName,
  case when a.id is null then null else '/media/' || a.id || '/' || a.hash end as authorAvatar,
  u.role = 'moderator' as authorIsModerator,
  qu.handle as quoteHandle,
  case when q.hidden then null
       else left(regexp_replace(regexp_replace(q.body, '!\\[[^\\]]*\\]\\([^)]*\\)', '', 'g'), '[*_#>' || chr(96) || ']', '', 'g'), 400)
  end as quoteExcerpt
`);

const POST_JOINS = sql.raw(`
  posts p
  join users u on u.id = p.userId
  left join uploads a on a.id = u.avatarId
  left join posts q on q.id = p.quotePostId
  left join users qu on qu.id = q.userId
`);

function readPost(id: string): PostRow {
  let row = sql<PostRow>(`
    select ${POST_COLUMNS}
      from ${POST_JOINS}
     where p.id = ${id}
  `).firstOrThrow("post not found");

  return row;
}

interface TopicState {
  id: string;
  userId: string;
  locked: boolean;
  allowsSolutions: boolean;
}

function topicState(topicId: string): TopicState {
  return sql<TopicState>(`
    select t.id, t.userId, t.locked, c.allowsSolutions
      from topics t
      join categories c on c.id = t.categoryId
     where t.id = ${topicId}
  `).firstOrThrow("topic not found");
}

export function follow(topicId: string, userId: string) {
  sql(`
    insert into follows (topicId, userId)
         values (${topicId}, ${userId})
    on conflict (topicId, userId) do nothing
  `);
}

/**
 * The posts in one topic, oldest first, a page at a time. Replies go in
 * through the view so every open copy of the topic sees them at once. Hiding
 * and marking a solution are updates; the postsNotify trigger carries the
 * side effects (the previous solution clearing) to the table's channel.
 */
export let posts: LiveTable<PostRow> = new LiveTable<PostRow>({
  select: ({ topicId }, w) => sql<PostRow>(`
    select ${POST_COLUMNS}
      from ${POST_JOINS}
     where p.topicId = ${topicId}
       and ${w.keyset("p")}
     order by ${w.order("p")} ${w.page()}
  `),

  insert: (item) => {
    session.isLoggedInOrThrow();

    let userId = session.getOrThrow("userId");
    let topic = topicState(item.topicId!);
    let body = (item.body ?? "").trim();

    if (topic.locked && !isModerator()) {
      throw new ForbiddenError("this topic is locked");
    }

    if (body.length === 0) {
      throw new ValidationError("write something first");
    }

    if (body.length > MAX_BODY) {
      throw new ValidationError(`replies are limited to ${MAX_BODY} characters`);
    }

    let quote = item.quotePostId ?? null;

    if (quote && sql(`select 1 from posts where id = ${quote} and topicId = ${topic.id}`).empty()) {
      quote = null;
    }

    tx(() => {
      sql(`
        insert into posts (id, topicId, userId, body, quotePostId)
             values (${item.id}, ${topic.id}, ${userId}, ${body}, ${quote})
      `);

      follow(topic.id, userId);
    });

    return readPost(item.id!);
  },

  update: (item) => {
    session.isLoggedInOrThrow();

    let current = sql<{ hidden: boolean; isSolution: boolean; isFirst: boolean }>(`
      select hidden, isSolution, isFirst from posts where id = ${item.id} and topicId = ${item.topicId}
    `).firstOrThrow("post not found");

    if (item.hidden !== current.hidden) {
      isModeratorOrThrow();
      sql(`update posts set hidden = ${item.hidden} where id = ${item.id}`);
    }

    if (item.isSolution !== current.isSolution) {
      markSolution(item.topicId, item.id, item.isSolution, current.isFirst);
    }

    return readPost(item.id);
  },

  delete: () => {
    throw new ForbiddenError("posts are hidden, not deleted");
  },
});

function markSolution(topicId: string, postId: string, on: boolean, isFirst: boolean) {
  let topic = topicState(topicId);

  if (!topic.allowsSolutions) {
    throw new ValidationError("only Help topics have solutions");
  }

  if (isFirst) {
    throw new ValidationError("the question can't be its own answer");
  }

  if (topic.userId !== session.getOrThrow("userId") && !isModerator()) {
    throw new ForbiddenError("only the person who asked can pick the solution");
  }

  tx(() => {
    if (on) {
      sql(`update posts set isSolution = false where topicId = ${topicId} and isSolution and id <> ${postId}`);
      sql(`update posts set isSolution = true where id = ${postId}`);
      sql(`update topics set solutionPostId = ${postId} where id = ${topicId}`);
    } else {
      sql(`update posts set isSolution = false where id = ${postId}`);
      sql(`update topics set solutionPostId = null where id = ${topicId} and solutionPostId = ${postId}`);
    }
  });
}

export let postLikes: LiveTable<PostLike> = new LiveTable<PostLike>({
  insert: (item) => {
    session.isLoggedInOrThrow();

    let userId = session.getOrThrow("userId");
    let author = sql<{ userId: string }>(`
      select userId from posts where id = ${item.postId} and topicId = ${item.topicId}
    `).firstOrThrow("post not found");

    if (author.userId === userId) {
      throw new ValidationError("you can't like your own post");
    }

    return postLikes.insert({ ...item, userId });
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: (item) => {
    session.isLoggedInOrThrow();

    if (item.userId !== session.getOrThrow("userId")) {
      throw new ForbiddenError();
    }

    return postLikes.delete(item);
  },
});

export function readTopic(id: string): TopicDetail {
  uuidOrThrow(id, "topic");

  return sql<TopicDetail>(`
    select t.id, t.title, t.userId, u.handle as authorHandle,
           t.categoryId, c.slug as categorySlug, c.name as categoryName, c.hue as categoryHue,
           c.allowsSolutions, t.pinned, t.locked, t.replyCount, t.likeCount, t.createdAt,
           t.solutionPostId
      from topics t
      join users u on u.id = t.userId
      join categories c on c.id = t.categoryId
     where t.id = ${id}
  `).firstOrThrow("topic not found");
}

export function readSolution(topic: TopicDetail): SolutionSummary | null {
  if (!topic.solutionPostId) {
    return null;
  }

  let row = sql<{ id: string; handle: string; body: string }>(`
    select p.id, u.handle, p.body
      from posts p
      join users u on u.id = p.userId
     where p.id = ${topic.solutionPostId} and not p.hidden
  `).first();

  if (!row) {
    return null;
  }

  return { id: row.id, handle: row.handle, excerpt: plainText(row.body, 280) };
}

export function isFollowing(topicId: string): boolean {
  let userId = session.get("userId");

  if (!userId) {
    return false;
  }

  return !sql(`select 1 from follows where topicId = ${topicId} and userId = ${userId}`).empty();
}

/** @rpc */
export function setFollow(topicId: string, on: boolean): boolean {
  if (!session.isLoggedIn()) {
    throw new AuthError("sign in to follow topics");
  }

  let userId = session.getOrThrow("userId");

  if (on) {
    follow(topicId, userId);
  } else {
    sql(`delete from follows where topicId = ${topicId} and userId = ${userId}`);
  }

  return on;
}

/** @rpc */
export function setPinned(topicId: string, pinned: boolean): boolean {
  isModeratorOrThrow();
  sql(`update topics set pinned = ${pinned} where id = ${topicId}`);

  return pinned;
}

/** @rpc */
export function setLocked(topicId: string, locked: boolean): boolean {
  isModeratorOrThrow();
  sql(`update topics set locked = ${locked} where id = ${topicId}`);

  return locked;
}

/** @rpc */
export function moveTopic(topicId: string, categoryId: string): TopicDetail {
  isModeratorOrThrow();

  let moved = sql(`
    update topics set categoryId = ${categoryId}
     where id = ${topicId} and exists (select 1 from categories where id = ${categoryId})
    returning id
  `).first();

  if (!moved) {
    throw new ValidationError("no such category");
  }

  // A topic moved out of Help keeps its replies but loses its solution.
  sql(`
    update posts p set isSolution = false
      from topics t
      join categories c on c.id = t.categoryId
     where t.id = ${topicId} and p.topicId = t.id and p.isSolution and not c.allowsSolutions
  `);

  sql(`
    update topics t set solutionPostId = null
      from categories c
     where t.id = ${topicId} and c.id = t.categoryId and not c.allowsSolutions and t.solutionPostId is not null
  `);

  return readTopic(topicId);
}
