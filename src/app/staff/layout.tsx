import { signOutStaff } from "../login/actions";
import { requireStaffProfile } from "@/lib/staff-auth";
import type { ReactNode } from "react";
import { OperatorShell } from "./operator-ui";

export const dynamic = "force-dynamic";

const primaryNavigation = [
  {
    label: "Operations",
    items: [
      { href: "/staff/command", label: "Command Center", ready: true },
      { href: "/staff/actions", label: "Actions", ready: true },
      { href: "/staff/applications", label: "Applications", ready: true },
      { href: "/staff/buyers", label: "Buyers", ready: true },
      { href: "/staff/families", label: "Families", ready: true },
      { href: "/staff/matching", label: "Matching", ready: true },
      { href: "/staff/reservations", label: "Reservations", ready: true },
      { href: "/staff/puppies", label: "Puppies", ready: true },
      { href: "/staff/dogs", label: "Dogs", ready: true },
      { href: "/staff/litters", label: "Litters", ready: true },
      { href: "/staff/breeding", label: "Breeding / Care", ready: true },
      { href: "/staff/media", label: "Media Center", ready: true },
      { href: "/staff/portal", label: "Portal Readiness", ready: true },
      { href: "/staff/go-home", label: "Go-Home", ready: true },
      { href: "/staff/payments", label: "Payments", ready: true },
      { href: "/staff/payment-plans", label: "Payment Plans", ready: true },
      { href: "/staff/documents", label: "Documents / Contracts", ready: true },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/staff/communications", label: "Communications / Follow-Ups", ready: true },
      { href: "/staff/email", label: "Email / Notifications", ready: true },
      { href: "/staff/messages", label: "Messages", ready: true },
      { href: "/staff/notifications", label: "Notifications", ready: true },
      { href: "/staff/events", label: "Events", ready: true },
      { href: "/staff/phone-lookup", label: "Phone Lookup", ready: true },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/staff", label: "Overview", ready: true },
      { href: "/staff/kennel-logs", label: "Kennel Logs", ready: true },
      { href: "/staff/proposed-actions", label: "Intelligence / Proposed Actions", ready: true },
      { href: "/staff/go-home/handoff", label: "Go-Home Handoff", ready: true },
    ],
  },
] as const;

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffProfile();

  return (
    <OperatorShell
      staffName={staff.displayName}
      staffRole={staff.role}
      navGroups={primaryNavigation}
      signOutAction={signOutStaff}
    >
      {children}
    </OperatorShell>
  );
}
