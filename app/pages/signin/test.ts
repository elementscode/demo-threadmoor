import { test, assert, equal, sql } from "@elements/app";
import route, { safeNext } from "./index";

test("signin", () => {
  test("lists the seeded demo accounts and their password", () => {
    sql(`
      insert into users (handle, email, passwordHash, displayName, role)
           values ('demo', 'demo@threadmoor.test', 'x', 'Demo Person', 'moderator')
    `);

    let html = (route({ params: {}, query: {} } as any, {} as any) as any).toHtml();

    assert(html.includes("demo@threadmoor.test"));
    assert(html.includes("sawdust123"));
  });

  test("with no demo accounts the panel is gone", () => {
    let html = (route({ params: {}, query: {} } as any, {} as any) as any).toHtml();

    assert(!html.includes("Demo logins"));
  });

  test("next only goes to a path on this site", () => {
    equal(safeNext("/t/123"), "/t/123");
    equal(safeNext("//evil.example"), "/");
    equal(safeNext("https://evil.example"), "/");
    equal(safeNext(undefined), "/");
  });
});
