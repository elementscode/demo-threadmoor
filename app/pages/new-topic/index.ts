import { Request, Response, redirect, session } from "@elements/app";
import { loadChrome } from "#app/shared/services/forum";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin?next=/new");
    return;
  }

  let chrome = loadChrome();
  let slug = typeof req.query.category === "string" ? req.query.category : "";
  let initialCategory = chrome.categories.find((c) => c.slug === slug) ?? chrome.categories[0];

  return new html({ chrome, initialCategory });
}
