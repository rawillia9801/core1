import { EmailReadinessPage } from "../email-readiness";

export default async function StaffEmailTestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  return <EmailReadinessPage focus="test" result={params.email} />;
}
