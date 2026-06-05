import CoreLoginShell from "../core-login-shell";

export const dynamic = "force-dynamic";

function messageFor(error: string | undefined, signedOut: string | undefined) {
  if (signedOut) {
    return "Signed out.";
  }

  if (error === "unauthorized") {
    return "This login is not authorized for Core owner/operator access.";
  }

  if (error === "missing_credentials") {
    return "Enter an owner email and password.";
  }

  if (error === "invalid_credentials") {
    return "Login failed. Check the email and password.";
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

  return <CoreLoginShell message={message} nextPath={next ?? "/staff"} />;
}
