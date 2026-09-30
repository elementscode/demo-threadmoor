import { Request, Response, redirect, session } from "@elements/app";
import { loadChrome } from "#app/shared/services/forum";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/");
    return;
  }

  return new html({ chrome: loadChrome() });
}
