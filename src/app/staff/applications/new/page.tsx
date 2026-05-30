import Link from "next/link";
import { createManualApplication } from "./actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

function ResultMessage({ outcome }: { outcome: string | undefined }) {
  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Manual application entry is restricted to owner/admin for now.
      </p>
    );
  }

  if (outcome === "invalid_contact") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Enter the applicant full name plus at least one contact method: email or phone.
      </p>
    );
  }

  if (outcome === "invalid_terms") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Terms acknowledgement is required before creating a manual application.
      </p>
    );
  }

  if (outcome === "invalid_input") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        One or more fields had an unsupported value or exceeded the allowed length.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Manual application creation failed. Check local server logs for safe error details.
      </p>
    );
  }

  return null;
}

function TextInput({
  label,
  name,
  required = false,
  type = "text",
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  maxLength,
  rows = 3,
}: {
  label: string;
  name: string;
  maxLength: number;
  rows?: number;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        maxLength={maxLength}
        rows={rows}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function NewStaffApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const staff = await requireStaffProfile();
  const { application } = await searchParams;
  const canCreateManualApplication = staff.role === "owner" || staff.role === "admin";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
              Protected staff workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              New Core Application
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Private owner/admin application entry. This creates a received Core
              application through the controlled RPC only.
            </p>
          </div>
          <Link
            href="/staff"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
            Core-native intake boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            No public application form, email sending, notification queue, Zoho
            writeback, payment collection, documents, or portal account creation
            is enabled from this page.
          </p>
        </section>

        <ResultMessage outcome={application} />

        {!canCreateManualApplication ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Owner/admin only
            </p>
            <p className="mt-2 text-sm leading-6">
              Signed in as {staff.displayName} ({staff.role}). Your role can view
              operational dashboard data, but manual application entry is restricted
              to owner/admin during this phase.
            </p>
          </section>
        ) : (
          <form
            action={createManualApplication}
            className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Applicant Contact
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Applicant name is required. Email or phone is required.
                </p>
              </div>
              <TextInput
                label="Applicant full name"
                name="applicantFullName"
                required
                maxLength={200}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label="Email" name="email" type="email" maxLength={320} />
                <TextInput label="Phone" name="phone" type="tel" maxLength={50} />
              </div>
              <SelectField
                label="Preferred contact method"
                name="preferredContactMethod"
                options={["Email", "Phone", "Text", "No Preference"]}
              />
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Puppy Preferences
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Interest type"
                  name="interestType"
                  maxLength={100}
                  placeholder="Current Puppy"
                />
                <TextInput
                  label="Color preference"
                  name="colorPreference"
                  maxLength={200}
                />
                <SelectField
                  label="Preferred coat type"
                  name="preferredCoatType"
                  options={["Smooth Coat", "Long Coat", "No Preference", "Undecided"]}
                />
                <SelectField
                  label="Preferred gender"
                  name="preferredGender"
                  options={["Male", "Female", "No Preference", "Undecided"]}
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Household And Readiness
              </h2>
              <TextArea label="Other pets" name="otherPets" maxLength={1000} />
              <TextArea label="Household notes" name="householdNotes" maxLength={2000} />
              <TextArea label="Readiness notes" name="readinessNotes" maxLength={2000} />
              <TextArea
                label="Payment preference text only"
                name="paymentPreference"
                maxLength={1000}
              />
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Staff Review Context
              </h2>
              <TextArea label="Staff notes" name="staffNotes" maxLength={2000} />
              <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="termsAcknowledged"
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  Terms were acknowledged for this manually entered application.
                  This does not send email, create a portal account, collect
                  payment, or approve the application.
                </span>
              </label>
            </section>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-500">
                Submitting calls `core_create_application_manual` with your staff
                profile as actor.
              </p>
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Create Received Application
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
