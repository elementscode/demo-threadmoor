import { Request, Response } from "@elements/app";
import { loadChrome } from "#app/shared/services/forum";
import { posts, postLikes, readTopic, readSolution, isFollowing, POST_PAGE } from "./services";
import html from "./template";

export default function route(req: Request, res: Response) {
  let topic = readTopic(req.params.id);

  return new html({
    chrome: loadChrome(),
    topic,
    posts: posts.view({ topicId: topic.id }, { orderBy: "createdAt asc", limit: POST_PAGE }),
    likes: postLikes.view({ topicId: topic.id }),
    solution: readSolution(topic),
    following: isFollowing(topic.id),
    loadedAt: new Date(),
  });
}
