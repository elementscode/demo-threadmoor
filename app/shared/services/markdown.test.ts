import { test, assert, equal } from "@elements/app";
import { renderMarkdown, plainText } from "./markdown";

test("markdown", () => {
  test("renders emphasis, lists and images", () => {
    let html = renderMarkdown("**oak** and _ash_\n\n- one\n- two\n\n![bowl](/media/1/abc)");

    assert(html.includes("<strong>oak</strong>"), html);
    assert(html.includes("<li>one</li>"), html);
    assert(html.includes('<img src="/media/1/abc" alt="bowl" loading="lazy">'), html);
  });

  test("raw html in a post renders as text", () => {
    let html = renderMarkdown("<script>alert(1)</script> <img src=x onerror=alert(1)>");

    assert(!html.includes("<script"), html);
    assert(!html.includes("<img src=x"), html);
    assert(html.includes("&lt;script&gt;"), html);
  });

  test("a javascript: link or image does not survive", () => {
    let link = renderMarkdown("[click](javascript:alert(1))");
    let image = renderMarkdown("![x](javascript:alert(1))");

    assert(!link.includes("href=\"javascript"), link);
    assert(!image.includes("<img"), image);
  });

  test("plain text drops images and markup and clips", () => {
    equal(plainText("**Hi** there ![a](/b)\n\n> quoted\n\n- list"), "Hi there list");
    equal(plainText("a".repeat(50), 10), "aaaaaaaaa…");
  });
});
