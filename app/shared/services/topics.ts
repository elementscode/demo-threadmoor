import { LiveTable, ForbiddenError, sql } from "@elements/app";

export interface TopicRow {
  id: string;
  categoryId: string;
  unanswered: boolean;
  title: string;
  excerpt: string;
  pinned: boolean;
  locked: boolean;
  solved: boolean;
  replyCount: number;
  likeCount: number;
  createdAt: Date;
  lastPostAt: Date;
  authorHandle: string;
  authorAvatar: string | null;
  lastHandle: string | null;
  categorySlug: string;
  categoryName: string;
  categoryHue: number;
}

const COLUMNS = sql.raw(`
  t.id, t.categoryId, t.unanswered, t.title, t.excerpt, t.pinned, t.locked,
  t.solutionPostId is not null as solved,
  t.replyCount, t.likeCount, t.createdAt, t.lastPostAt,
  u.handle as authorHandle,
  case when a.id is null then null else '/media/' || a.id || '/' || a.hash end as authorAvatar,
  lu.handle as lastHandle,
  c.slug as categorySlug, c.name as categoryName, c.hue as categoryHue
`);

const JOINS = sql.raw(`
  topics t
  join users u on u.id = t.userId
  join categories c on c.id = t.categoryId
  left join users lu on lu.id = t.lastPostUserId
  left join uploads a on a.id = u.avatarId
`);

/**
 * Every topic list. Opened whole for the front page, on `categoryId` for a
 * category, on `unanswered` for the unanswered tab and on `pinned` for the
 * pinned strip. Topics are written
 * through rpc and triggers, never through the view, so the topicsNotify
 * trigger is what makes a new topic or a fresh reply reach an open list.
 */
export let topics: LiveTable<TopicRow> = new LiveTable<TopicRow>({
  select: (p, w) => sql<TopicRow>(`
    select ${COLUMNS}
      from ${JOINS}
     where (${p.categoryId ?? null}::uuid is null or t.categoryId = ${p.categoryId ?? null}::uuid)
       and (${p.unanswered ?? null}::boolean is null or t.unanswered = ${p.unanswered ?? null}::boolean)
       and (${p.pinned ?? null}::boolean is null or t.pinned = ${p.pinned ?? null}::boolean)
       and ${w.keyset("t")}
     order by ${w.order("t")} ${w.page()}
  `),

  insert: () => {
    throw new ForbiddenError();
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

export const TOPIC_PAGE = 25;

/** Topics started in the last thirty days, by likes then replies. */
export function topThisMonth(categoryId: string | null): TopicRow[] {
  return sql<TopicRow>(`
    select ${COLUMNS}
      from ${JOINS}
     where t.createdAt > now() - interval '30 days'
       and (${categoryId}::uuid is null or t.categoryId = ${categoryId}::uuid)
     order by t.likeCount desc, t.replyCount desc, t.lastPostAt desc
     limit 30
  `).all();
}

export function topicsByUser(userId: string): TopicRow[] {
  return sql<TopicRow>(`
    select ${COLUMNS}
      from ${JOINS}
     where t.userId = ${userId}
     order by t.lastPostAt desc
     limit 20
  `).all();
}
