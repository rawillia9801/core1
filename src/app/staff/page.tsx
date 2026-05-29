import CoreDashboard from "../core-dashboard";
import { signOutStaff } from "../login/actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{
    approval?: string;
    reservation?: string;
    payment?: string;
    cancellation?: string;
  }>;
}) {
  const staff = await requireStaffProfile();

  return (
    <>
      <section className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
              Protected staff workspace foundation
            </p>
            <p className="mt-1 text-sm leading-6">
              Signed in as {staff.displayName} ({staff.role}). Selected real data
              remains blocked until action actor mapping and authorization are
              verified.
            </p>
          </div>
          <form action={signOutStaff}>
            <button
              type="submit"
              className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900"
            >
              Sign Out
            </button>
          </form>
        </div>
      </section>
      <CoreDashboard searchParams={searchParams} staff={staff} />
    </>
  );
}
