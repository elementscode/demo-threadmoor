import { test, assert, sql } from "@elements/app";
import { makeUser, makeTopic, makeReply } from "#app/shared/services/fixtures";
import route from "./index";

test("profile", () => {
  test("shows the bio, topics and replies", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    sql(`update users set bio = 'I turn bowls.', location = 'Leeds' where id = ${ann}`);
    let { topicId } = makeTopic(bo, "projects", "Bo's bench");
    makeTopic(ann, "projects", "Ann's bowl");
    makeReply(topicId, ann, "Great vise.");

    let html = (route({ params: { handle: "ANN" }, query: {} } as any, {} as any) as any).toHtml();

    assert(html.includes("I turn bowls."), "bio");
    assert(html.includes("Leeds"), "location");
    assert(html.includes("Ann&#39;s bowl") || html.includes("Ann's bowl"), "topic");
    assert(html.includes("Great vise."), "reply");
  });
});
