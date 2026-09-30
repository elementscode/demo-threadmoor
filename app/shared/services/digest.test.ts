import { test, assert, equal, sql } from "@elements/app";
import { makeUser, makeTopic, makeReply } from "./fixtures";
import { buildDigest, sendDigest, membersWithNews } from "./digest";
import DigestEmail from "#app/emails/digest";

function follow(topicId: string, userId: string) {
  sql(`insert into follows (topicId, userId) values (${topicId}, ${userId}) on conflict do nothing`);
}

test("digest", () => {
  test("collects other people's new replies in followed topics", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "help", "Chatter");
    let other = makeTopic(bo, "tools", "Not followed").topicId;

    follow(topicId, ann);
    makeReply(topicId, bo, "Skew the blade.");
    makeReply(topicId, ann, "Thanks, trying it.");
    makeReply(other, bo, "Elsewhere.");

    let hidden = makeReply(topicId, bo, "spam");
    sql(`update posts set hidden = true where id = ${hidden}`);

    let digest = buildDigest(ann);

    equal(digest.replyCount, 1);
    equal(digest.topics.length, 1);
    equal(digest.topics[0].title, "Chatter");
    equal(digest.topics[0].replies[0].handle, "bo");
    assert(membersWithNews().includes(ann));
  });

  test("sending moves the window, so the next digest is empty", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "projects", "Bench");

    follow(topicId, ann);
    makeReply(topicId, bo, "Nice dog holes.");

    equal(sendDigest(ann).replyCount, 1);
    equal(buildDigest(ann).replyCount, 0);
    assert(!membersWithNews().includes(ann));
  });

  test("the email lists each topic with a link", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "projects", "Hall table");

    follow(topicId, ann);
    makeReply(topicId, bo, "Great **butterfly** key.");

    let digest = buildDigest(ann);
    let html = new DigestEmail({ digest }).toHtml();

    assert(html.includes("Hall table"), "title");
    assert(html.includes(`/t/${topicId}`), "link");
    assert(html.includes("Great butterfly key."), "excerpt without markup");
  });
});
