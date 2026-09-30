![Threadmoor, a woodworking discussion forum built with Elements: a Help topic about blotchy stain on pine, with a photo, a solved banner, follow and moderator tools.](TBD)

# Threadmoor

> A demo app built with [Elements](https://elements.dev).

Topics with markdown and photos, quoted replies, likes and marked solutions, live lists, a daily digest of followed topics, and moderator tools.

**Demo:** [Threadmoor](TBD)

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
