import Link from "next/link";
import { signOutStaff } from "../login/actions";
import { requireStaffProfile } from "@/lib/staff-auth";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const primaryNavigation = [
  { href: "/staff", label: "Dashboard", ready: true },
  { href: "/staff/applications", label: "Applications", ready: true },
  { href: "/staff/buyers", label: "Buyers", ready: false },
  { href: "/staff/families", label: "Families", ready: false },
  { href: "/staff/dogs", label: "Dogs", ready: false },
  { href: "/staff/litters", label: "Litters", ready: false },
  { href: "/staff/puppies", label: "Puppies", ready: false },
  { href: "/staff/reservations", label: "Reservations", ready: true },
  { href: "/staff/payments", label: "Payments", ready: true },
  { href: "/staff/go-home", label: "Go-Home", ready: true },
  { href: "/staff/documents", label: "Documents", ready: false },
  { href: "/staff/messages", label: "Messages", ready: false },
  { href: "/staff/notifications", label: "Notifications", ready: true },
  { href: "/staff/phone-lookup", label: "Phone Lookup", ready: false },
  { href: "/staff/kennel-logs", label: "Kennel Logs", ready: false },
  { href: "/staff/events", label: "Events", ready: false },
] as const;

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffProfile();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <aside className="hidden border-r border-slate-800 bg-slate-950 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:px-5 lg:py-6">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
            Cherolee
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Core</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Unified business and kennel command center.
          </p>
        </div>

        <nav className="space-y-1 pb-8">
          {primaryNavigation.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <div
                key={item.href}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-500"
                title="Workspace page not built yet"
              >
                {item.label}
              </div>
            ),
          )}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <section className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                Protected staff workspace foundation
              </p>
              <p className="mt-1 text-sm leading-6">
                Signed in as {staff.displayName} ({staff.role}). Core is the autonomous operator layer; this staff workspace is the controlled command surface around it.
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

        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:hidden lg:px-8">
          <div className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto">
            {primaryNavigation
              .filter((item) => item.ready)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
