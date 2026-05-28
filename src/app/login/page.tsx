import { signInWithPassword } from "./actions";

export const dynamic = "force-dynamic";

function messageFor(error: string | undefined, signedOut: string | undefined) {
  if (signedOut) {
    return "Signed out.";
  }

  if (error === "unauthorized") {
    return "Your login does not have an active Core staff profile.";
  }

  if (error === "missing_credentials") {
    return "Enter a staff email and password.";
  }

  if (error === "invalid_credentials") {
    return "Staff sign-in failed. Check the email and password.";
  }

  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
    signed_out?: string;
  }>;
}) {
  const { error, next, signed_out: signedOut } = await searchParams;
  const message = messageFor(error, signedOut);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
          Cherolee Core
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Staff Sign In
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Staff workspace access only. Customer portal access is not part of this
          foundation.
        </p>

        {message ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <form action={signInWithPassword} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? "/staff"} />
          <label className="block text-sm font-medium text-slate-700">
            Staff email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
