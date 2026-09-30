import { App } from "@elements/app";
import config from "#config";
import topics from "#app/pages/topics";
import topic from "#app/pages/topic";
import newTopic from "#app/pages/new-topic";
import profile from "#app/pages/profile";
import settings from "#app/pages/settings";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import serveMedia from "#app/routes/media";
import { DailyDigestJob } from "#app/jobs/daily-digest";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", topics);
app.route("/:tab(top|unanswered)", topics);
app.route("/c/:slug", topics);
app.route("/c/:slug/:tab(top|unanswered)", topics);
app.route("/t/:id", topic);
app.route("/new", newTopic);
app.route("/u/:handle", profile);
app.route("/settings", settings);
app.route("/signin", signin);
app.route("/signup", signup);
app.route("/media/:id/:hash", serveMedia);

app.cron("every day at 8am", "daily digest", () => new DailyDigestJob().schedule());

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
