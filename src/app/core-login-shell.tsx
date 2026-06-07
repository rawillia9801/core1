import CoreLoginEffects from "./core-login-effects";

type LoginFormAction = (formData: FormData) => void | Promise<void>;

type CoreLoginShellProps = {
  message?: string | null;
  nextPath?: string;
  formAction?: LoginFormAction;
};

export default function CoreLoginShell({
  message,
  nextPath = "/staff",
  formAction,
}: CoreLoginShellProps) {
  const isAuthForm = Boolean(formAction);

  return (
    <main className="core-login-screen">
      <CoreLoginEffects />
      <div className="cursor" id="cursor" aria-hidden="true" />
      <div className="cursor-dot" id="cursor-dot" aria-hidden="true" />
      <canvas id="bg-canvas" aria-hidden="true" />
      <div className="core-login-scanlines" aria-hidden="true" />
      <div className="core-login-vignette" aria-hidden="true" />

      <section className="core-login-layout" aria-label="Cherolee Core OS login">
        <header className="core-login-topbar">
          <div className="core-login-topbar-left">
            <strong>CHEROLEE CORE OS</strong>
            <span />
            <p>INTELLIGENT KENNEL COMMAND</p>
          </div>
          <div className="core-login-topbar-right" aria-hidden="true">
            <p><span className="core-login-dot core-login-dot-teal" />SYSTEM ONLINE</p>
            <p><span className="core-login-dot core-login-dot-gold" />SECURITY ARMED</p>
            <p id="live-time">00:00:00</p>
          </div>
        </header>

        <aside className="core-login-side core-login-side-left" aria-hidden="true">
          <p className="core-login-panel-title">Core Modules</p>
          {[
            ["AI Chatbot", "ONLINE", "MODEL", "CHEROLEE-7B"],
            ["Home Automation", "ACTIVE", "CLIMATE", "72.4F"],
            ["Smart Kennel", "MONITORING", "OCCUPIED", "6 / 8"],
            ["Health Monitor", "NOMINAL", "VITALS", "ALL CLEAR"],
            ["Perimeter Sec.", "ARMED", "CAMERAS", "8 LIVE"],
          ].map(([name, status, label, value], index) => (
            <article className="core-login-module" key={name}>
              <div>
                <strong>{name}</strong>
                <span>{status}</span>
              </div>
              <p>{label} <b>{value}</b></p>
              <i style={{ width: `${76 + index * 5}%` }} />
            </article>
          ))}
          <div className="core-login-radar">
            <canvas id="radar-canvas" width="200" height="100" />
          </div>
        </aside>

        <form
          action={formAction ?? "/login"}
          className="core-login-card"
          method={isAuthForm ? undefined : "get"}
        >
          <span className="core-login-corner core-login-corner-tr" aria-hidden="true" />
          <span className="core-login-corner core-login-corner-bl" aria-hidden="true" />

          <div className="core-login-logo-area">
            <div className="core-login-logo-icon" aria-hidden="true">
              <span />
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="coreLoginGold" x1="10" y1="8" x2="54" y2="56">
                    <stop stopColor="#f0c040" />
                    <stop offset="0.52" stopColor="#c9a84c" />
                    <stop offset="1" stopColor="#7a6228" />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="29" stroke="url(#coreLoginGold)" strokeWidth="1.2" fill="rgba(201,168,76,0.06)" />
                <path d="M44 20a16 16 0 1 0 0 24" stroke="url(#coreLoginGold)" strokeWidth="5" strokeLinecap="round" />
                <circle cx="44" cy="20" r="3" fill="#f0c040" />
                <circle cx="44" cy="44" r="3" fill="#f0c040" />
              </svg>
            </div>
            <h1>Cherolee</h1>
            <p>CORE OS - BUILD 4.2.1 - AUTHENTICATED</p>
            <div className="core-login-divider" aria-hidden="true">
              <span />
              <i />
              <span />
            </div>
          </div>

          {isAuthForm ? (
            <input type="hidden" name="next" value={nextPath} />
          ) : null}

          {message ? (
            <p className="core-login-message" role="status">
              {message}
            </p>
          ) : null}

          <label className="core-login-field">
            <span>Access Identifier</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.8c-2.7 0-5.2-.6-7.5-1.7Z" />
            </svg>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="Enter owner identifier"
              aria-label="Owner login email"
            />
          </label>

          {isAuthForm ? (
            <label className="core-login-field core-login-password-field">
              <span>Security Passphrase</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.8a4.5 4.5 0 1 0-9 0v3.7m-.8 11.3h10.6a2.3 2.3 0 0 0 2.2-2.3v-6.7a2.3 2.3 0 0 0-2.2-2.3H6.8a2.3 2.3 0 0 0-2.3 2.3v6.7a2.3 2.3 0 0 0 2.3 2.3Z" />
              </svg>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Enter secure passphrase"
                aria-label="Owner login password"
              />
            </label>
          ) : null}

          <div className="core-login-biometric" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.9 4.2A7.5 7.5 0 0 1 19.5 10.5c0 2.9-.6 5.7-1.6 8.3M5.7 6.4A7.5 7.5 0 0 0 4.5 10.5a7.5 7.5 0 0 1-1.2 4m2 3.6A11.2 11.2 0 0 0 8.3 10.5a3.8 3.8 0 1 1 7.5 0c0 .5 0 1-.1 1.6M12 10.5a14.9 14.9 0 0 1-3.6 9.8m6.6-4.6a18.7 18.7 0 0 1-2.5 5.3" />
            </svg>
            <p><strong>Biometric Auth</strong> - Fingerprint or Face ID</p>
            <span>&gt;</span>
          </div>

          <button type="submit" className="core-login-button">
            <span className="btn-spinner" id="btn-spinner" aria-hidden="true" />
            <span id="btn-text">INITIATE ACCESS</span>
          </button>

          <div className="core-login-auth-options" aria-hidden="true">
            <span>Reset Credentials</span>
            <span>Emergency Access</span>
            <span>System Admin</span>
          </div>

          <div className="core-login-strip" aria-hidden="true">
            <span />
            <p id="sys-msg">SYSTEM NOMINAL - ALL KENNEL UNITS SECURE - AI CORE OPERATIONAL</p>
          </div>
        </form>

        <aside className="core-login-side core-login-side-right" aria-hidden="true">
          <p className="core-login-panel-title">Smart Kennel Monitor</p>
          <div className="core-login-kennel-grid">
            {[
              ["Bella", "71.2F - 46%RH"],
              ["Coco", "72.0F - 47%RH"],
              ["Max", "70.8F - 49%RH"],
              ["Luna", "71.6F - 45%RH"],
              ["Peanut", "72.3F - 47%RH"],
              ["Chica", "71.9F - 48%RH"],
              ["VACANT", "-"],
              ["VACANT", "-"],
            ].map(([item, detail], index) => (
              <div key={`${item}-${index}`}>
                <span>UNIT {String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
          <p className="core-login-panel-title">System Event Log</p>
          <div className="core-login-feed live-feed">
            <div className="feed-inner" id="feed-inner" />
          </div>
          <div className="core-login-spark-section">
            <p className="core-login-panel-title">Temp. Trend (24h)</p>
            <div className="sparkline-wrap" id="sparkline" />
          </div>
        </aside>

        <footer className="core-login-bottombar">
          <p>VERSION <span>4.2.1-STABLE</span></p>
          <p>REGION <span>SW VIRGINIA</span></p>
          <p>ENCRYPTION <span>AES-256</span></p>
          <p>LATENCY <span id="latency">4ms</span></p>
          <p>PRIVATE SYSTEM - OWNER ACCESS ONLY</p>
        </footer>
      </section>
    </main>
  );
}
