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
      <div className="core-login-noise" aria-hidden="true" />
      <div className="core-login-hud" aria-hidden="true" />
      <div className="core-login-kennel" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="core-login-emblem" aria-hidden="true">
        <svg viewBox="0 0 520 520" role="presentation">
          <defs>
            <linearGradient id="emblem-gold" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#f7e8bd" />
              <stop offset="42%" stopColor="#c99a4b" />
              <stop offset="100%" stopColor="#6f4619" />
            </linearGradient>
            <radialGradient id="emblem-fill" cx="50%" cy="42%" r="64%">
              <stop offset="0%" stopColor="#f4d28a" stopOpacity="0.18" />
              <stop offset="62%" stopColor="#09151b" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#05090c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M260 33 L438 112 L416 388 L260 487 L104 388 L82 112 Z"
            fill="url(#emblem-fill)"
            stroke="url(#emblem-gold)"
            strokeWidth="2.5"
            opacity="0.72"
          />
          <path
            d="M169 335 C205 366 263 372 309 341 C346 316 367 273 361 228 C355 178 318 143 272 137 C235 132 200 146 178 173"
            fill="none"
            stroke="url(#emblem-gold)"
            strokeLinecap="round"
            strokeWidth="11"
            opacity="0.80"
          />
          <path
            d="M187 176 C161 127 150 84 156 54 C189 76 214 112 228 151"
            fill="none"
            stroke="url(#emblem-gold)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
            opacity="0.64"
          />
          <path
            d="M290 146 C314 103 347 78 383 65 C382 106 364 149 329 183"
            fill="none"
            stroke="url(#emblem-gold)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
            opacity="0.64"
          />
          <path
            d="M169 335 C134 315 115 282 115 244 C115 201 139 166 178 150 C201 141 230 137 260 141"
            fill="none"
            stroke="rgba(247, 232, 189, 0.45)"
            strokeLinecap="round"
            strokeWidth="3"
            opacity="0.76"
          />
          <path
            d="M218 244 C238 232 265 232 286 246"
            fill="none"
            stroke="rgba(247, 232, 189, 0.36)"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <circle cx="298" cy="218" r="5" fill="#f7e8bd" opacity="0.68" />
          <path
            d="M352 267 C387 274 417 291 442 317"
            fill="none"
            stroke="rgba(247, 232, 189, 0.28)"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            fill="none"
            d="M338 299 C373 316 399 344 416 382"
            stroke="rgba(247, 232, 189, 0.20)"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M132 396 H388"
            fill="none"
            stroke="url(#emblem-gold)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.38"
          />
        </svg>
      </div>

      <section className="core-login-stage" aria-label="Cherolee Core OS login">
        <div className="core-login-brand">
          <div className="core-login-crest" aria-hidden="true">
            C
          </div>
          <h1 className="core-login-title">CHEROLEE CORE OS</h1>
          <p className="core-login-tagline">INTELLIGENT. AUTONOMOUS. RELENTLESS.</p>
        </div>

        <form action={signInWithPassword} className="core-login-panel">
          <input type="hidden" name="next" value={nextPath} />

          {message ? (
            <p className="core-login-message" role="status">
              {message}
            </p>
          ) : null}

          <label className="core-login-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="Owner Login"
              aria-label="Owner login email"
            />
          </label>

          <label className="core-login-field">
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

          <button type="submit" className="core-login-button">
            LOGIN
          </button>
        </form>

        <p className="core-login-footer">PRIVATE SYSTEM. OWNER ACCESS ONLY.</p>
      </section>
    </main>
  );
}
