import CoreDashboard from "../core-dashboard";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{
    application?: string;
    approval?: string;
    reservation?: string;
    payment?: string;
    cancellation?: string;
  }>;
}) {
  const staff = await requireStaffProfile();

  return <CoreDashboard searchParams={searchParams} staff={staff} />;
}
