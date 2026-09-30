/**
 * The keys threadmoor stores in the session, so `session.get("userId")` is
 * typed. `role` is a display hint only: every moderator action re-reads the
 * role from the users table.
 */
declare module "@elements/app" {
  interface SessionData {
    userId: string;
    userName: string;
    role: "member" | "moderator";
  }
}

export {};
