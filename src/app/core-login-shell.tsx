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
      <div className="core-login-dog" aria-hidden="true">
        <svg viewBox="0 0 420 440" role="presentation">
          <defs>
            <linearGradient id="dog-fur" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#080a0c" />
              <stop offset="58%" stopColor="#18120e" />
              <stop offset="100%" stopColor="#4a3118" />
            </linearGradient>
            <linearGradient id="dog-gold" x1="0" x2="1">
              <stop offset="0%" stopColor="#8a5a22" />
              <stop offset="48%" stopColor="#f4d28a" />
              <stop offset="100%" stopColor="#9b6827" />
            </linearGradient>
          </defs>
          <path
            d="M120 212 C65 166 37 89 51 32 C103 49 145 94 166 151 C182 145 202 141 222 142 C247 92 292 47 346 31 C358 91 333 164 277 211 C295 238 303 274 298 309 C289 374 244 412 185 407 C128 402 89 359 86 301 C84 267 95 237 120 212 Z"
            fill="url(#dog-fur)"
          />
          <path
            d="M132 197 C88 155 72 100 76 65 C113 88 139 126 155 166 Z"
            fill="#06080a"
          />
          <path
            d="M274 168 C291 126 317 88 355 65 C356 101 340 157 294 198 Z"
            fill="#06080a"
          />
          <path
            d="M158 290 C171 268 195 257 219 260 C244 263 262 279 270 301 C252 340 181 342 158 290 Z"
            fill="#d6a65f"
            opacity="0.72"
          />
          <path
            d="M142 248 C154 232 179 232 190 249 C180 258 152 258 142 248 Z"
            fill="#c58a45"
            opacity="0.78"
          />
          <path
            d="M251 249 C262 231 287 232 299 248 C288 258 261 258 251 249 Z"
            fill="#c58a45"
            opacity="0.78"
          />
          <circle cx="166" cy="245" r="14" fill="#090b0e" />
          <circle cx="274" cy="245" r="14" fill="#090b0e" />
          <circle cx="171" cy="240" r="4" fill="#f6e2b4" />
          <circle cx="279" cy="240" r="4" fill="#f6e2b4" />
          <path
            d="M207 291 C217 285 230 286 239 293 C236 303 228 309 218 309 C209 309 201 302 207 291 Z"
            fill="#050608"
          />
          <path
            d="M218 310 C216 325 203 331 191 328 M219 310 C221 324 235 331 247 327"
            stroke="#07090b"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M123 210 C93 203 64 216 38 249 M310 210 C342 204 371 218 396 250"
            stroke="#15110d"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.72"
            fill="none"
          />
          <circle cx="220" cy="373" r="30" fill="none" stroke="url(#dog-gold)" strokeWidth="5" />
          <path
            d="M207 372 L218 385 L237 358"
            fill="none"
            stroke="url(#dog-gold)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
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
