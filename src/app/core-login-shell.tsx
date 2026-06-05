import { signInWithPassword } from "./login/actions";

type CoreLoginShellProps = {
  message?: string | null;
  nextPath?: string;
};

export default function CoreLoginShell({
  message,
  nextPath = "/staff",
}: CoreLoginShellProps) {
  return (
    <main className="core-login-screen">
      <section className="core-login-stage" aria-label="Cherolee Core OS login">
        <form action={signInWithPassword} className="core-login-panel">
          <input type="hidden" name="next" value={nextPath} />

          {message ? (
            <p className="core-login-message" role="status">
              {message}
            </p>
          ) : null}

          <label className="core-login-field">
            <span>Login</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="Login"
              aria-label="Owner login email"
            />
          </label>

          <button type="submit" className="core-login-button">
            LOGIN
          </button>

          <label className="core-login-field core-login-password-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              aria-label="Owner login password"
            />
          </label>
        </form>

        <p className="core-login-footer">PRIVATE SYSTEM. OWNER ACCESS ONLY.</p>
      </section>
    </main>
  );
}
