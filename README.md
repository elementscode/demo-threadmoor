![Threadmoor, a woodworking discussion forum built with Elements: a Help topic about blotchy stain on pine, with a photo, a solved banner, follow and moderator tools.](https://elements.dev/demos/01a0f3f6-d2c9-742c-b9f5-f4a6f72cf35a/poster?v=d255e151ed6f)

# Threadmoor

> A demo app built with [Elements](https://elements.dev).

Topics with photos, quoted replies, likes, marked solutions, live topic lists, a daily digest and moderator tools.

**Demo:** [Threadmoor](https://elements.dev/demos/01a0f3f6-d2c9-742c-b9f5-f4a6f72cf35a)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 30 min
- **Cost:** $9.74 at API rates, September 2026

## Get started

```bash
elements create threadmoor -scaffold=elementscode/demo-threadmoor
```

## How it's built

Threadmoor needed topic lists that update as people post, replies that land on every open copy of a thread, image uploads, a daily email digest and moderator controls. Each of those is a part of Elements, so the agent spent its 30 minutes on the forum itself.

### What Elements gave the app

- **Live topic lists.** Topics are a LiveTable opened on the front page, per category, on the unanswered tab and on the pinned strip, 25 at a time. A database trigger announces each new topic and fresh reply, so every open list moves as the forum does.

- **Live threads.** Posts and likes are LiveTables. A reply, with its quote, appears on every open copy of the topic, and marking a solution or hiding a post updates every screen, the previous solution included.

- **Moderation as function calls.** Moderators pin, lock and move topics with `@rpc` functions, each checked against the signed-in user's role.

- **Image uploads.** The editor uploads photos through an rpc that returns the markdown to embed them, and a route serves each image under its content hash.

- **A daily digest.** One cron line runs a job each morning that queues an email for every member with new replies in the topics they follow, one job per member so each retries on its own.

- **Data from SQL files.** Three migrations define the forum, add four categories with solutions turned on for Help, and seed nine members, thirty topics, replies, likes, avatars and woodworking photos.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 38 tests pass. Every page works on desktop and phone, and live updates arrive across tabs, such as new topics, replies, solutions and hidden posts.

## Seed data and demo accounts

The seed creates four categories (Projects, Tools, Finishing, Help), 33
topics with about 150 replies, likes, quoted replies, marked solutions in
Help, and illustrated project photos. One topic, "What's on your bench this
week?", has 54 posts so you can see infinite scroll. The sign-in page lists
every account; click one to sign in. Every password is `sawdust123`.

| Email                          | Name            | Role      |
| ------------------------------ | --------------- | --------- |
| marta@threadmoor.test          | Marta Lindqvist | moderator |
| oakandiron@threadmoor.test     | Dev Patel       | member    |
| hollis@threadmoor.test         | Hollis Grant    | member    |
| juneturns@threadmoor.test      | June Okafor     | member    |
| benchdog@threadmoor.test       | Sam Rivera      | member    |
| cedarsmith@threadmoor.test     | Priya Nair      | member    |
| shavings@threadmoor.test       | Tom Becker      | member    |
| reclaimedruth@threadmoor.test  | Ruth Adeyemi    | member    |
| knotty@threadmoor.test         | Leo Marsh       | member    |

The daily digest goes out at 8am. In development, emails are written to
`.elements/logs/program.log` instead of being sent, and Settings has a "Send
my digest now" button.

## The prompt

```text
Build a discussion forum named threadmoor for a woodworking community.

- Sign up, log in, profile with avatar and bio.
- Categories (projects, tools, finishing, help), each with topics.
- Start a topic with markdown and images; reply; quote a reply.
- Like posts. Mark a reply as the solution in the help category.
- Topic lists: latest, top this month, unanswered.
- Follow topics; a daily email digest of new replies in followed topics.
- Moderators pin, lock and move topics, and hide posts.

Seed a moderator, eight members, four categories and about thirty topics with
replies and images. Show the seeded logins on the sign-in page.

New topics and replies appear in real time, with infinite scroll on long
topics.
```

## License

MIT. See [LICENSE](LICENSE). The seed's images and avatars are illustrations
drawn for this demo, not photographs, and are covered by the same license.
