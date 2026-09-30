import { test, assert, equal, sql } from "@elements/app";
import { makeUser, makeTopic, signInAs } from "#app/shared/services/fixtures";
import { saveProfile, unfollow, MAX_BIO } from "./template";
import route from "./index";

test("settings", () => {
  test("saves the profile, trimmed", () => {
    let ann = makeUser("ann");
    signInAs(ann);

    saveProfile({ displayName: "  Ann Turner ", location: " Leeds ", bio: " Bowls. " });

    let row = sql<{ displayName: string; location: string; bio: string }>(`
      select displayName, location, bio from users where id = ${ann}
    `).firstOrThrow();

    equal(row, { displayName: "Ann Turner", location: "Leeds", bio: "Bowls." });
  });

  test("refuses a bio that is too long", () => {
    signInAs(makeUser("ann"));

    let refused = false;

    try {
      saveProfile({ displayName: "", location: "", bio: "x".repeat(MAX_BIO + 1) });
    } catch {
      refused = true;
    }

    assert(refused);
  });

  test("lists followed topics and unfollows", () => {
    let ann = makeUser("ann");
    let { topicId } = makeTopic(ann, "tools", "Saw sharpening");
    sql(`insert into follows (topicId, userId) values (${topicId}, ${ann})`);
    signInAs(ann);

    let html = (route({ params: {}, query: {} } as any, {} as any) as any).toHtml();
    assert(html.includes("Saw sharpening"));

    unfollow(topicId);
    assert(sql(`select 1 from follows where userId = ${ann}`).empty());
  });
});
