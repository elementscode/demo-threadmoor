const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m", "3h", "4d", then a short date. */
export function timeAgo(date: Date | undefined | null, now: Date = new Date()): string {
  if (!date) {
    return "just now";
  }

  let ms = now.getTime() - new Date(date).getTime();

  if (ms < MINUTE) {
    return "just now";
  }

  if (ms < HOUR) {
    return `${Math.floor(ms / MINUTE)}m`;
  }

  if (ms < DAY) {
    return `${Math.floor(ms / HOUR)}h`;
  }

  if (ms < 30 * DAY) {
    return `${Math.floor(ms / DAY)}d`;
  }

  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fullDate(date: Date | undefined | null): string {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function plural(n: number, one: string, many: string = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}
