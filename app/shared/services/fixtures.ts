import { sql, session } from "@elements/app";

/** Rows for tests. Each test's transaction rolls them back. */
export function makeUser(handle: string, role: "member" | "moderator" = "member"): string {
  return sql<{ id: string }>(`
    insert into users (handle, email, passwordHash, displayName, role)
         values (${handle}, ${handle + "@test.local"}, crypt('password123', genSalt('bf', 4)), ${handle}, ${role})
      returning id
  `).firstOrThrow().id;
}

export function signInAs(userId: string) {
  let user = sql<{ handle: string; role: "member" | "moderator" }>(`
    select handle, role from users where id = ${userId}
  `).firstOrThrow();

  session.login({ userId, userName: user.handle, role: user.role });
}

export function categoryId(slug: string): string {
  return sql<{ id: string }>(`select id from categories where slug = ${slug}`).firstOrThrow().id;
}

export interface MadeTopic {
  topicId: string;
  firstPostId: string;
}

export function makeTopic(userId: string, slug: string, title: string, body: string = "Opening post."): MadeTopic {
  let topicId = sql<{ id: string }>(`
    insert into topics (categoryId, userId, title, excerpt)
         values (${categoryId(slug)}, ${userId}, ${title}, ${body})
      returning id
  `).firstOrThrow().id;

  let firstPostId = sql<{ id: string }>(`
    insert into posts (topicId, userId, body, isFirst)
         values (${topicId}, ${userId}, ${body}, true)
      returning id
  `).firstOrThrow().id;

  return { topicId, firstPostId };
}

export function makeReply(topicId: string, userId: string, body: string): string {
  return sql<{ id: string }>(`
    insert into posts (topicId, userId, body) values (${topicId}, ${userId}, ${body}) returning id
  `).firstOrThrow().id;
}
