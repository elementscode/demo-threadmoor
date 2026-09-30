import { Request, Response } from "@elements/app";
import { loadChrome, findCategory } from "#app/shared/services/forum";
import { topics, topThisMonth, TOPIC_PAGE } from "#app/shared/services/topics";
import html, { Tab } from "./template";

export default function route(req: Request, res: Response) {
  let chrome = loadChrome();
  let category = req.params.slug ? findCategory(req.params.slug) : null;
  let tab: Tab = req.params.tab === "top" || req.params.tab === "unanswered" ? req.params.tab : "latest";
  let window = { orderBy: "lastPostAt desc", limit: TOPIC_PAGE };
  let partition: { categoryId?: string; unanswered?: boolean } = {};
  let pinned: { categoryId?: string; pinned: boolean } = { pinned: true };

  if (category) {
    partition.categoryId = category.id;
    pinned.categoryId = category.id;
  }

  if (tab === "unanswered") {
    partition.unanswered = true;
  }

  return new html({
    chrome,
    category,
    tab,
    pinned: tab === "latest" ? topics.view(pinned, { orderBy: "lastPostAt desc", limit: 10 }) : null,
    live: tab === "top" ? null : topics.view(partition, window),
    top: tab === "top" ? topThisMonth(category?.id ?? null) : [],
    loadedAt: new Date(),
  });
}
