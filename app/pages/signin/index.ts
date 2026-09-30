import { Request, Response, redirect, session, sql } from "@elements/app";
import { loadChrome } from "#app/shared/services/forum";
import html, { DemoLogin } from "./template";

/** Only a same-site path is a place to go after signing in. */
export function safeNext(next: unknown): string {
  if (typeof next === "string" && /^\/(?!\/)/.test(next)) {
    return next;
  }

  return "/";
}

export default function route(req: Request, res: Response) {
  let next = safeNext(req.query.next);

  if (session.isLoggedIn()) {
    redirect(next);
    return;
  }

  // The development seed is the only source of these accounts, so on a deploy
  // the list is empty and the panel does not render.
  let demos = sql<DemoLogin>(`
    select u.id, u.handle, u.email, u.displayName,
           case when a.id is null then null else '/media/' || a.id || '/' || a.hash end as avatar,
           u.role = 'moderator' as isModerator
      from users u
      left join uploads a on a.id = u.avatarId
     where u.email like '%@threadmoor.test'
     order by u.role desc, u.createdAt
  `).all();

  return new html({ chrome: loadChrome(), demos, next });
}
