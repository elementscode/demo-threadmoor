import { test, assert, equal, session, sql, AuthError, ValidationError } from "@elements/app";
import { signin, signup } from "./auth";

test("auth", () => {
  test("signup creates a member and signs them in", () => {
    signup({ handle: "New.Joiner", email: "Joiner@Example.com", password: "longenough" });

    let user = sql<{ handle: string; email: string; role: string }>(`
      select handle, email, role from users where handle = 'new.joiner'
    `).firstOrThrow();

    equal(user.email, "joiner@example.com");
    equal(user.role, "member");
    equal(session.get("userName"), "new.joiner");
  });

  test("signup reports every bad field at once", () => {
    let errors: any = null;

    try {
      signup({ handle: "x", email: "nope", password: "short" });
    } catch (err: any) {
      assert(err instanceof ValidationError);
      errors = err.errors;
    }

    assert(errors?.handle && errors?.email && errors?.password, JSON.stringify(errors));
  });

  test("signin takes a handle or an email", () => {
    signup({ handle: "planer", email: "planer@example.com", password: "longenough" });
    session.logout();

    signin("@Planer", "longenough");
    equal(session.get("userName"), "planer");

    session.logout();
    signin("PLANER@example.com", "longenough");
    equal(session.get("userName"), "planer");
  });

  test("a wrong password is refused without saying which part was wrong", () => {
    signup({ handle: "rasp", email: "rasp@example.com", password: "longenough" });
    session.logout();

    let message = "";

    try {
      signin("rasp", "wrongpassword");
    } catch (err: any) {
      message = err.message;
    }

    equal(message, "that login and password don't match");
    assert(!session.isLoggedIn());
  });

  test("the error is an AuthError", () => {
    try {
      signin("nobody", "whatever1");
    } catch (err: any) {
      assert(err instanceof AuthError);
    }
  });
});
