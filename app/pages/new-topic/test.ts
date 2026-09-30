import { test, assert, equal, sql, ValidationError } from "@elements/app";
import { makeUser, signInAs, categoryId } from "#app/shared/services/fixtures";
import { createTopic } from "./template";

test("new-topic", () => {
  test("creates the topic, its opening post and a follow", () => {
    let ann = makeUser("ann");
    signInAs(ann);

    let id = createTopic({ categoryId: categoryId("finishing"), title: "  Shellac   over oil? ", body: "Can I put **shellac** over Danish oil?" });

    let topic = sql<{ title: string; excerpt: string; unanswered: boolean }>(`select title, excerpt, unanswered from topics where id = ${id}`).firstOrThrow();
    equal(topic.title, "Shellac over oil?");
    equal(topic.excerpt, "Can I put shellac over Danish oil?");
    equal(topic.unanswered, true);

    let first = sql<{ isFirst: boolean }>(`select isFirst from posts where topicId = ${id}`).all();
    equal(first.length, 1);
    equal(first[0].isFirst, true);

    assert(!sql(`select 1 from follows where topicId = ${id} and userId = ${ann}`).empty(), "author follows");
  });

  test("validates title and body", () => {
    signInAs(makeUser("ann"));

    let errors: any = null;

    try {
      createTopic({ categoryId: categoryId("help"), title: "hi", body: "   " });
    } catch (err: any) {
      assert(err instanceof ValidationError);
      errors = err.errors;
    }

    assert(errors?.title && errors?.body, JSON.stringify(errors));
  });

  test("requires a session", () => {
    let refused = false;

    try {
      createTopic({ categoryId: categoryId("help"), title: "Anonymous question", body: "Hello?" });
    } catch {
      refused = true;
    }

    assert(refused);
  });
});
