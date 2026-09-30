import { sql, email } from "@elements/app";
import { plainText } from "#app/shared/services/markdown";
import DigestEmail from "#app/emails/digest";

export interface DigestReply {
  id: string;
  handle: string;
  excerpt: string;
}

export interface DigestTopic {
  id: string;
  title: string;
  count: number;
  replies: DigestReply[];
}

export interface Digest {
  userId: string;
  to: string;
  handle: string;
  since: Date;
  until: Date | null;
  topics: DigestTopic[];
  replyCount: number;
}

export const REPLIES_PER_TOPIC = 3;

interface Row {
  topicId: string;
  title: string;
  postId: string;
  handle: string;
  body: string;
  createdAt: Date;
}

/**
 * New replies in the topics a member follows since their last digest, or the
 * last day for someone who has never had one. Their own replies and hidden
 * posts are left out.
 */
export function buildDigest(userId: string): Digest {
  let user = sql<{ email: string; handle: string; since: Date }>(`
    select email, handle, coalesce(lastDigestAt, now() - interval '1 day') as since
      from users
     where id = ${userId}
  `).firstOrThrow("member not found");

  let rows = sql<Row>(`
    select t.id as topicId, t.title, p.id as postId, u.handle, p.body, p.createdAt
      from follows f
      join topics t on t.id = f.topicId
      join posts p on p.topicId = t.id
      join users u on u.id = p.userId
     where f.userId = ${userId}
       and p.userId <> ${userId}
       and not p.isFirst
       and not p.hidden
       and p.createdAt > ${user.since}
     order by t.lastPostAt desc, p.createdAt desc
  `).all();

  let topics: DigestTopic[] = [];
  let byId = new Map<string, DigestTopic>();
  let until: Date | null = null;

  for (let row of rows) {
    if (!until || row.createdAt > until) {
      until = row.createdAt;
    }

    let topic = byId.get(row.topicId);

    if (!topic) {
      topic = { id: row.topicId, title: row.title, count: 0, replies: [] };
      byId.set(row.topicId, topic);
      topics.push(topic);
    }

    topic.count++;

    if (topic.replies.length < REPLIES_PER_TOPIC) {
      topic.replies.push({ id: row.postId, handle: row.handle, excerpt: plainText(row.body, 180) });
    }
  }

  return {
    userId,
    to: user.email,
    handle: user.handle,
    since: user.since,
    until,
    topics,
    replyCount: rows.length,
  };
}

/** Sends one member's digest. Returns it, empty when there was nothing to send. */
export function sendDigest(userId: string): Digest {
  let digest = buildDigest(userId);

  if (digest.replyCount === 0) {
    return digest;
  }

  let subject = digest.topics.length === 1
    ? `${digest.replyCount} new ${digest.replyCount === 1 ? "reply" : "replies"} in "${digest.topics[0].title}"`
    : `${digest.replyCount} new replies in ${digest.topics.length} topics you follow`;

  email({ to: digest.to, subject, body: new DigestEmail({ digest }) });

  // The newest reply sent, not the clock: the next digest starts exactly
  // where this one ended, so no reply is sent twice or skipped.
  sql(`update users set lastDigestAt = ${digest.until} where id = ${userId}`);

  return digest;
}

/** Members with at least one new reply waiting in a followed topic. */
export function membersWithNews(): string[] {
  return sql<{ id: string }>(`
    select distinct u.id
      from users u
      join follows f on f.userId = u.id
      join posts p on p.topicId = f.topicId
     where p.userId <> u.id
       and not p.isFirst
       and not p.hidden
       and p.createdAt > coalesce(u.lastDigestAt, now() - interval '1 day')
  `).all().map((r) => r.id);
}
