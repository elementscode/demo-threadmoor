import { sql, session, NotFoundError } from "@elements/app";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id in a url is a missing page, not a database error. */
export function uuidOrThrow(id: string, what: string): string {
  if (!UUID.test(id)) {
    throw new NotFoundError(`${what} not found`);
  }

  return id;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  hue: number;
  allowsSolutions: boolean;
  topicCount: number;
}

export interface Me {
  id: string;
  handle: string;
  displayName: string;
  avatar: string | null;
  isModerator: boolean;
}

/** What every page's header needs: the categories and who is signed in. */
export interface Chrome {
  categories: Category[];
  me: Me | null;
}

export function listCategories(): Category[] {
  return sql<Category>(`
    select c.id, c.slug, c.name, c.description, c.hue, c.allowsSolutions,
           (select count(*)::int from topics t where t.categoryId = c.id) as topicCount
      from categories c
     order by c.position
  `).all();
}

export function findCategory(slug: string): Category {
  return sql<Category>(`
    select c.id, c.slug, c.name, c.description, c.hue, c.allowsSolutions,
           (select count(*)::int from topics t where t.categoryId = c.id) as topicCount
      from categories c
     where c.slug = ${slug}
  `).firstOrThrow("no such category");
}

export function currentMember(): Me | null {
  let userId = session.get("userId");

  if (!userId) {
    return null;
  }

  let me = sql<Me>(`
    select u.id, u.handle, u.displayName,
           case when a.id is null then null else '/media/' || a.id || '/' || a.hash end as avatar,
           u.role = 'moderator' as isModerator
      from users u
      left join uploads a on a.id = u.avatarId
     where u.id = ${userId}
  `).first();

  return me ?? null;
}

export function loadChrome(): Chrome {
  return { categories: listCategories(), me: currentMember() };
}
