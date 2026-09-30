import { sql, session, AuthError, ForbiddenError, ValidationError } from "@elements/app";

export const MIN_PASSWORD = 8;

interface Credentials {
  id: string;
  handle: string;
  role: "member" | "moderator";
}

export interface SignupForm {
  handle: string;
  email: string;
  password: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Signs in with an email or a handle.
 * @rpc
 */
export function signin(login: string, password: string) {
  let key = normalize(login).replace(/^@/, "");

  if (!key || !password) {
    throw new AuthError("enter your email or handle and your password");
  }

  let user = sql<Credentials>(`
    select id, handle, role from users
     where (email = ${key} or handle = ${key})
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("that login and password don't match");
  }

  session.login({ userId: user.id, userName: user.handle, role: user.role });
}

/** @rpc */
export function signup(form: SignupForm) {
  let handle = normalize(form.handle).replace(/^@/, "");
  let email = normalize(form.email);
  let errors: Record<string, string[]> = {};

  if (!/^[a-z0-9][a-z0-9._-]{1,23}$/.test(handle)) {
    errors.handle = ["2 to 24 letters, numbers, dots, dashes or underscores"];
  } else if (!sql(`select 1 from users where handle = ${handle}`).empty()) {
    errors.handle = ["that handle is taken"];
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = ["enter a valid email address"];
  } else if (!sql(`select 1 from users where email = ${email}`).empty()) {
    errors.email = ["that email is already registered"];
  }

  if (form.password.length < MIN_PASSWORD) {
    errors.password = [`at least ${MIN_PASSWORD} characters`];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  let user = sql<{ id: string }>(`
    insert into users (handle, email, passwordHash, displayName)
         values (${handle}, ${email}, crypt(${form.password}, genSalt('bf', 12)), ${handle})
      returning id
  `).firstOrThrow();

  session.login({ userId: user.id, userName: handle, role: "member" });
}

/** @rpc */
export function signout() {
  session.logout();
}

export function isModerator(): boolean {
  let userId = session.get("userId");

  if (!userId) {
    return false;
  }

  return !sql(`select 1 from users where id = ${userId} and role = 'moderator'`).empty();
}

export function isModeratorOrThrow() {
  session.isLoggedInOrThrow();

  if (!isModerator()) {
    throw new ForbiddenError("moderators only");
  }
}
