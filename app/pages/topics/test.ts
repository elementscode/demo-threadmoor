import { test, assert } from "@elements/app";
import { makeUser, makeTopic, makeReply } from "#app/shared/services/fixtures";
import route from "./index";

function render(params: Record<string, string>): string {
  let page = route({ params, query: {} } as any, {} as any) as any;

  return page.toHtml();
}

test("topics", () => {
  test("latest lists topics with their category", () => {
    let ann = makeUser("ann");
    makeTopic(ann, "tools", "Restoring a No. 4");

    let html = render({});

    assert(html.includes("Restoring a No. 4"));
    assert(html.includes("Tools"));
  });

  test("a category shows only its own topics", () => {
    let ann = makeUser("ann");
    makeTopic(ann, "tools", "Plane question");
    makeTopic(ann, "finishing", "Oil question");

    let html = render({ slug: "finishing" });

    assert(html.includes("Oil question"));
    assert(!html.includes("Plane question"));
  });

  test("unanswered leaves out topics with replies", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let quiet = makeTopic(ann, "help", "Nobody answered me");
    let busy = makeTopic(ann, "help", "Everyone answered me");
    makeReply(busy.topicId, bo, "Here you go.");

    let html = render({ tab: "unanswered" });

    assert(html.includes("Nobody answered me"));
    assert(!html.includes("Everyone answered me"));
    assert(quiet.topicId.length > 0);
  });

  test("top this month ranks by likes", () => {
    let ann = makeUser("ann");
    makeTopic(ann, "projects", "Popular build");

    let html = render({ tab: "top" });

    assert(html.includes("Popular build"));
    assert(html.includes("Most liked"));
  });
});
