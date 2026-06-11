import net from "node:net";
import tls from "node:tls";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  ownerTo: string;
};

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | null;
};

function env(name: string) {
  return String(process.env[name] ?? "").trim();
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = env("SMTP_HOST");
  const user = env("SMTP_USER") || env("SMTP_USERNAME");
  const pass = env("SMTP_PASS") || env("SMTP_PASSWORD");
  const from = env("SMTP_FROM") || env("APPLICATION_EMAIL_FROM");
  const ownerTo = env("APPLICATION_EMAIL_TO") || env("APPLICATION_ALERT_TO") || env("SMTP_OWNER_TO");
  const port = Number(env("SMTP_PORT") || "465");
  const secure = env("SMTP_SECURE") ? env("SMTP_SECURE") !== "false" : port === 465;

  if (!host || !user || !pass || !from || !ownerTo || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, secure, user, pass, from, ownerTo };
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dotStuff(value: string) {
  return value.replace(/(^|\r?\n)\./g, "$1..");
}

function socketLineReader(socket: net.Socket | tls.TLSSocket) {
  let buffer = "";
  const waiters: Array<(line: string) => void> = [];

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    while (waiters.length > 0 && /\r?\n/.test(buffer)) {
      const match = buffer.match(/\r?\n/);
      if (!match || match.index === undefined) break;
      const line = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      waiters.shift()?.(line);
    }
  });

  return () =>
    new Promise<string>((resolve) => {
      waiters.push(resolve);
    });
}

async function readResponse(readLine: () => Promise<string>) {
  const lines: string[] = [];
  while (true) {
    const line = await readLine();
    lines.push(line);
    if (/^\d{3} /.test(line)) return lines.join("\n");
  }
}

function assertSmtpOk(response: string, expected: number[]) {
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) {
    throw new Error(`SMTP response ${code}: ${response}`);
  }
}

function write(socket: net.Socket | tls.TLSSocket, command: string) {
  return new Promise<void>((resolve, reject) => {
    socket.write(command + "\r\n", (error) => (error ? reject(error) : resolve()));
  });
}

function connect(config: SmtpConfig) {
  return new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const socket = config.secure
      ? tls.connect(config.port, config.host, { servername: config.host }, () => resolve(socket))
      : net.connect(config.port, config.host, () => resolve(socket));
    socket.once("error", reject);
    socket.setTimeout(15000, () => {
      socket.destroy(new Error("SMTP connection timed out"));
    });
  });
}

function buildMessage(config: SmtpConfig, input: SendMailInput) {
  const boundary = `core-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const from = escapeHeader(config.from);
  const to = escapeHeader(input.to);
  const subject = escapeHeader(input.subject);
  const replyTo = input.replyTo ? `Reply-To: ${escapeHeader(input.replyTo)}\r\n` : "";
  const text = input.text.replace(/\r?\n/g, "\r\n");
  const html = input.html ?? `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`;

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    replyTo.trimEnd(),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${boundary}--`,
    "",
  ]
    .filter((line) => line !== "")
    .join("\r\n");
}

export async function sendSmtpMail(config: SmtpConfig, input: SendMailInput) {
  const socket = await connect(config);
  const readLine = socketLineReader(socket);

  try {
    assertSmtpOk(await readResponse(readLine), [220]);
    await write(socket, `EHLO ${config.host}`);
    assertSmtpOk(await readResponse(readLine), [250]);
    await write(socket, "AUTH LOGIN");
    assertSmtpOk(await readResponse(readLine), [334]);
    await write(socket, Buffer.from(config.user).toString("base64"));
    assertSmtpOk(await readResponse(readLine), [334]);
    await write(socket, Buffer.from(config.pass).toString("base64"));
    assertSmtpOk(await readResponse(readLine), [235]);
    await write(socket, `MAIL FROM:<${config.from.replace(/^.*<|>.*$/g, "")}>`);
    assertSmtpOk(await readResponse(readLine), [250]);
    await write(socket, `RCPT TO:<${input.to}>`);
    assertSmtpOk(await readResponse(readLine), [250, 251]);
    await write(socket, "DATA");
    assertSmtpOk(await readResponse(readLine), [354]);
    await write(socket, `${dotStuff(buildMessage(config, input))}\r\n.`);
    assertSmtpOk(await readResponse(readLine), [250]);
    await write(socket, "QUIT");
  } finally {
    socket.end();
  }
}
