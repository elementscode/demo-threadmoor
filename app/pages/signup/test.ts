import { test, assert } from "@elements/app";
import route from "./index";

test("signup", () => {
  test("renders the form with password-manager hints", () => {
    let html = (route({ params: {}, query: {} } as any, {} as any) as any).toHtml();

    assert(/autocomplete=['"]new-password['"]/.test(html));
    assert(html.includes("Create account"));
  });
});
