export const stats = [
  {
    label: "Applications",
    value: "7",
    helper: "3 need review",
    tone: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  {
    label: "Reserved Puppies",
    value: "12",
    helper: "5 go-home soon",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  {
    label: "Balance Due",
    value: "$18,450",
    helper: "ledger-derived total",
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  {
    label: "Today",
    value: "14",
    helper: "feed items",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
] as const;

export const foundationChecks = [
  "Migrations apply locally",
  "Core smoke test passes",
  "Go-home effective view passes",
  "Lint passes",
] as const;

export const navigation = [
  "Dashboard",
  "Applications",
  "Buyers",
  "Families",
  "Dogs",
  "Litters",
  "Puppies",
  "Reservations",
  "Payments",
  "Go-Home",
  "Documents",
  "Messages",
  "Phone Lookup",
  "Kennel Logs",
  "Events",
] as const;

export const goHomes = [
  {
    puppy: "Luna Test Puppy",
    buyer: "Sarah Test Buyer",
    time: "May 30, 2:00 PM",
    source: "Group default",
    status: "Scheduled",
  },
  {
    puppy: "Nova Test Puppy",
    buyer: "Sarah Test Buyer",
    time: "May 30, 5:00 PM",
    source: "Individual override",
    status: "Review",
  },
  {
    puppy: "Blue Boy",
    buyer: "Miller Family",
    time: "Jun 2, 11:00 AM",
    source: "Ungrouped detail",
    status: "Pending",
  },
] as const;

export const reservations = [
  {
    puppy: "Pink Girl",
    buyer: "Davis Family",
    status: "Deposit paid",
    balance: "$1,500 due",
  },
  {
    puppy: "Luna Test Puppy",
    buyer: "Sarah Test Buyer",
    status: "Reserved",
    balance: "$1,530 due",
  },
  {
    puppy: "Cream Girl",
    buyer: "Watson Family",
    status: "Contract sent",
    balance: "$2,000 due",
  },
] as const;

export const phoneLookups = [
  {
    phone: "+1 (276) 555-0101",
    result: "Unambiguous match",
    detail: "Safe context available after server validation",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    phone: "+1 (276) 555-0102",
    result: "Ambiguous match",
    detail: "Sensitive details redacted; route to staff",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
] as const;

export const kennelNotes = [
  "Weight log due for Ember litter",
  "Pupdate draft needed for reserved puppies",
  "Medication reminder requires staff confirmation",
  "No AI write actions are enabled",
] as const;

export const emptyStates = [
  {
    title: "Documents",
    text: "Template-driven generation, signatures, and customer visibility are planned but not connected.",
  },
  {
    title: "Customer Portal",
    text: "Portal screens wait for RLS, document visibility rules, and verified family access.",
  },
  {
    title: "Integrations",
    text: "Zoho, Twilio, email, payments, Home Assistant, cameras, and smart mirror remain off.",
  },
] as const;
