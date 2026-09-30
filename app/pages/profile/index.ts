import { Request, Response, sql } from "@elements/app";
import { loadChrome } from "#app/shared/services/forum";
import { topicsByUser } from "#app/shared/services/topics";
import { plainText } from "#app/shared/services/markdown";
import html, { Profile, RecentReply } from "./template";

export default function route(req: Request, res: Response) {
  let profile = sql<Profile>(`
    select u.id, u.handle, u.displayName, u.bio, u.location, u.createdAt,
           case when a.id is null then null else '/media/' || a.id || '/' || a.hash end as avatar,
           u.role = 'moderator' as isModerator,
           (select count(*)::int from topics t where t.userId = u.id) as topicCount,
           (select count(*)::int from posts p where p.userId = u.id and not p.isFirst) as replyCount,
           (select count(*)::int from postLikes l join posts p on p.id = l.postId where p.userId = u.id) as likesReceived,
           (select count(*)::int from posts p where p.userId = u.id and p.isSolution) as solutionCount
      from users u
      left join uploads a on a.id = u.avatarId
     where u.handle = ${req.params.handle.toLowerCase()}
  `).firstOrThrow("no such member");

  let replies = sql<RecentReply & { body: string }>(`
    select p.id, p.topicId, t.title as topicTitle, p.body, p.createdAt
      from posts p
      join topics t on t.id = p.topicId
     where p.userId = ${profile.id} and not p.isFirst and not p.hidden
     order by p.createdAt desc
     limit 10
  `).all().map((r): RecentReply => ({ ...r, excerpt: plainText(r.body, 200) }));

  return new html({ chrome: loadChrome(), profile, topics: topicsByUser(profile.id), replies });
}
