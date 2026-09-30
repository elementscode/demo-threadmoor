import { Request, Response, redirect, session, sql } from "@elements/app";
import { loadChrome } from "#app/shared/services/forum";
import html, { ProfileForm, Followed } from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin?next=/settings");
    return;
  }

  let userId = session.getOrThrow("userId");
  let user = sql<ProfileForm & { email: string; avatar: string | null }>(`
    select u.displayName, u.location, u.bio, u.email,
           case when a.id is null then null else '/media/' || a.id || '/' || a.hash end as avatar
      from users u
      left join uploads a on a.id = u.avatarId
     where u.id = ${userId}
  `).firstOrThrow();

  let follows = sql<Followed>(`
    select f.id, f.topicId, t.title, t.lastPostAt
      from follows f
      join topics t on t.id = f.topicId
     where f.userId = ${userId}
     order by t.lastPostAt desc
  `).all();

  return new html({
    chrome: loadChrome(),
    initial: { displayName: user.displayName, location: user.location, bio: user.bio },
    avatar: user.avatar,
    follows,
    welcome: req.query.welcome === "1",
    email: user.email,
  });
}
