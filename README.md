![A discussion forum with a daily digest, built by Claude Code on Elements: a Help topic about blotchy stain on pine, with a photo, a solved banner, follow and moderator tools.](https://elements.dev/demos/01a0f3f6-d2c9-742c-b9f5-f4a6f72cf35a/poster?v=d255e151ed6f)

# A discussion forum with a daily digest, built by Claude Code on Elements

> Threadmoor is a full-stack app built with Claude Code on Elements.

Topics with photos, quoted replies, likes, marked solutions, live topic lists, a daily digest and moderator tools.

[Run this app on your machine](https://elements.dev/demos/01a0f3f6-d2c9-742c-b9f5-f4a6f72cf35a). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Threadmoor needed topic lists that update as people post, replies that land on every open copy of a thread, image uploads, a daily email digest and moderator controls. Each of those is a part of Elements, so the agent spent its 30 minutes on the forum itself.

- **Live topic lists.** Topics are a LiveTable opened on the front page, per category, on the unanswered tab and on the pinned strip, 25 at a time. A database trigger announces each new topic and fresh reply, so every open list moves as the forum does.

- **Live threads.** Posts and likes are LiveTables. A reply, with its quote, appears on every open copy of the topic, and marking a solution or hiding a post updates every screen, the previous solution included.

- **Moderation as function calls.** Moderators pin, lock and move topics with `@rpc` functions, each checked against the signed-in user's role.

- **Image uploads.** The editor uploads photos through an rpc that returns the markdown to embed them, and a route serves each image under its content hash.

- **A daily digest.** One cron line runs a job each morning that queues an email for every member with new replies in the topics they follow, one job per member so each retries on its own.

- **Data from SQL files.** Three migrations define the forum, add four categories with solutions turned on for Help, and seed nine members, thirty topics, replies, likes, avatars and woodworking photos.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
