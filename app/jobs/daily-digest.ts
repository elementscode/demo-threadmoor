import { Job } from "@elements/app";
import { membersWithNews, sendDigest } from "#app/shared/services/digest";

/** One member's digest, retried on its own if the mail server hiccups. */
export class SendDigestJob extends Job<{ userId: string }> {
  static maxAttempts = 5;

  run() {
    sendDigest(this.fields.userId);
  }
}

/** Fans the morning run out into one job per member with something new. */
export class DailyDigestJob extends Job {
  static maxAttempts = 1;

  run() {
    for (let userId of membersWithNews()) {
      new SendDigestJob({ userId }).schedule();
    }
  }
}
