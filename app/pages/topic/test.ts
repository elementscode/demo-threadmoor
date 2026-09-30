import { test, assert, equal, session, sql } from "@elements/app";
import { makeUser, makeTopic, makeReply, signInAs } from "#app/shared/services/fixtures";
import { posts, postLikes, setLocked, setFollow, moveTopic, readTopic } from "./services";
import route from "./index";

function topicRow(topicId: string) {
  return sql<{ replyCount: number; unanswered: boolean; solutionPostId: string | null; likeCount: number }>(`
    select replyCount, unanswered, solutionPostId, likeCount from topics where id = ${topicId}
  `).firstOrThrow();
}

test("topic", () => {
  test("the page renders the opening post and replies", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "projects", "Walnut hall table", "Finished it **today**.");
    makeReply(topicId, bo, "Lovely grain.");

    let page = route({ params: { id: topicId }, query: {} } as any, {} as any) as any;
    let html = page.toHtml();

    assert(html.includes("Walnut hall table"), "title");
    assert(html.includes("<strong>today</strong>"), "markdown body");
    assert(html.includes("Lovely grain."), "reply");
    assert(html.includes("Sign in to reply"), "anonymous call to action");
  });

  test("a member replies through the view", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "help", "Glue-up racks");

    equal(topicRow(topicId).unanswered, true);

    signInAs(bo);
    posts.view({ topicId }).insert({ body: "Clamp on the joint line." });

    let t = topicRow(topicId);
    equal(t.replyCount, 1);
    equal(t.unanswered, false);

    let followed = !sql(`select 1 from follows where topicId = ${topicId} and userId = ${bo}`).empty();
    assert(followed, "replying follows the topic");
  });

  test("an anonymous visitor cannot reply", () => {
    let ann = makeUser("ann");
    let { topicId } = makeTopic(ann, "tools", "Which plane first?");

    let message = "";

    try {
      posts.view({ topicId }).insert({ body: "hi" });
    } catch (err: any) {
      message = err.message;
    }

    assert(message.length > 0, "refused");
    equal(topicRow(topicId).replyCount, 0);
  });

  test("a locked topic takes replies from moderators only", () => {
    let ann = makeUser("ann");
    let mod = makeUser("mod", "moderator");
    let { topicId } = makeTopic(ann, "tools", "Old swap thread");

    signInAs(mod);
    setLocked(topicId, true);

    signInAs(ann);
    let err1 = "";

    try {
      posts.view({ topicId }).insert({ body: "one more" });
    } catch (err: any) {
      err1 = err.message;
    }

    equal(err1, "this topic is locked");

    signInAs(mod);
    posts.view({ topicId }).insert({ body: "Closing note." });
    equal(topicRow(topicId).replyCount, 1);
  });

  test("members cannot lock, pin or move", () => {
    let ann = makeUser("ann");
    let { topicId } = makeTopic(ann, "tools", "Mine");

    signInAs(ann);
    let err2 = "";

    try {
      setLocked(topicId, true);
    } catch (err: any) {
      err2 = err.message;
    }

    equal(err2, "moderators only");
  });

  test("the asker marks a solution in help, and a new one replaces it", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let cy = makeUser("cy");
    let { topicId } = makeTopic(ann, "help", "Blotchy pine");
    let first = makeReply(topicId, bo, "Use conditioner.");
    let second = makeReply(topicId, cy, "Washcoat of shellac, then gel stain.");

    signInAs(bo);
    let view = posts.view({ topicId });
    let row = view.get(first)!;
    let err3 = "";

    try {
      view.update({ ...row, isSolution: true });
    } catch (err: any) {
      err3 = err.message;
    }

    equal(err3, "only the person who asked can pick the solution");

    signInAs(ann);
    view = posts.view({ topicId });
    view.update({ ...view.get(first)!, isSolution: true });
    equal(topicRow(topicId).solutionPostId, first);

    view.update({ ...view.get(second)!, isSolution: true });
    equal(topicRow(topicId).solutionPostId, second);

    let flags = sql<{ id: string; isSolution: boolean }>(`select id, isSolution from posts where topicId = ${topicId} and isSolution`).all();
    equal(flags.length, 1);
    equal(flags[0].id, second);
  });

  test("solutions are for help topics only", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "projects", "My bench");
    let reply = makeReply(topicId, bo, "Nice.");

    signInAs(ann);
    let view = posts.view({ topicId });
    let err4 = "";

    try {
      view.update({ ...view.get(reply)!, isSolution: true });
    } catch (err: any) {
      err4 = err.message;
    }

    equal(err4, "only Help topics have solutions");
  });

  test("moving out of help clears the solution", () => {
    let ann = makeUser("ann");
    let mod = makeUser("mod", "moderator");
    let { topicId } = makeTopic(ann, "help", "Actually a project");
    let reply = makeReply(topicId, mod, "Moving this.");

    signInAs(ann);
    let view = posts.view({ topicId });
    view.update({ ...view.get(reply)!, isSolution: true });

    signInAs(mod);
    let moved = moveTopic(topicId, sql<{ id: string }>(`select id from categories where slug = 'projects'`).firstOrThrow().id);

    equal(moved.categorySlug, "projects");
    equal(readTopic(topicId).solutionPostId, null);
  });

  test("only moderators hide posts, and a hidden body is never served", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let mod = makeUser("mod", "moderator");
    let { topicId } = makeTopic(ann, "tools", "Sharpening");
    let reply = makeReply(topicId, bo, "Buy my course at spam.example");

    signInAs(ann);
    let view = posts.view({ topicId });
    let err5 = "";

    try {
      view.update({ ...view.get(reply)!, hidden: true });
    } catch (err: any) {
      err5 = err.message;
    }

    equal(err5, "moderators only");

    signInAs(mod);
    view = posts.view({ topicId });
    let hidden = view.update({ ...view.get(reply)!, hidden: true });
    equal(hidden.body, "");

    let reread = posts.view({ topicId }).get(reply)!;
    equal(reread.hidden, true);
    equal(reread.body, "");
  });

  test("likes count on the topic and cannot be your own", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId, firstPostId } = makeTopic(ann, "projects", "Bowl");

    signInAs(ann);
    let err6 = "";

    try {
      postLikes.view({ topicId }).insert({ postId: firstPostId });
    } catch (err: any) {
      err6 = err.message;
    }

    equal(err6, "you can't like your own post");

    signInAs(bo);
    let likes = postLikes.view({ topicId });
    likes.insert({ postId: firstPostId, userId: ann });

    let like = sql<{ userId: string }>(`select userId from postLikes where postId = ${firstPostId}`).firstOrThrow();
    equal(like.userId, bo, "the like belongs to the caller, whatever the payload said");
    equal(topicRow(topicId).likeCount, 1);
  });

  test("follow and unfollow", () => {
    let ann = makeUser("ann");
    let bo = makeUser("bo");
    let { topicId } = makeTopic(ann, "tools", "Chisels");

    signInAs(bo);
    setFollow(topicId, true);
    setFollow(topicId, true);
    equal(sql<{ n: number }>(`select count(*)::int as n from follows where userId = ${bo}`).firstOrThrow().n, 1);

    setFollow(topicId, false);
    equal(sql<{ n: number }>(`select count(*)::int as n from follows where userId = ${bo}`).firstOrThrow().n, 0);

    session.logout();
    let err7 = "";

    try {
      setFollow(topicId, true);
    } catch (err: any) {
      err7 = err.message;
    }

    assert(err7.length > 0, "anonymous follow refused");
  });
});
