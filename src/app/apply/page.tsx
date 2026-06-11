import { submitCustomerApplication } from "./actions";

export const dynamic = "force-dynamic";

function TextInput({ label, name, required = false, type = "text", maxLength, placeholder }: { label: string; name: string; required?: boolean; type?: string; maxLength?: number; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input type={type} name={name} required={required} maxLength={maxLength} placeholder={placeholder} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
    </label>
  );
}

function TextArea({ label, name, maxLength, rows = 4, placeholder }: { label: string; name: string; maxLength: number; rows?: number; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea name={name} maxLength={maxLength} rows={rows} placeholder={placeholder} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select name={name} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
        <option value="">Select one</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default function CustomerApplicationPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Southwest Virginia Chihuahua</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Puppy Application</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Tell us about your home, preferences, timing, and readiness. This does not reserve a puppy, approve an application, collect payment, or create a portal account.</p>
        </section>

        <form action={submitCustomerApplication} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Applicant Contact</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Name and email are required so we can confirm that the application was received.</p>
            </div>
            <TextInput label="Applicant full name" name="applicantFullName" required maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Email" name="email" type="email" required maxLength={320} />
              <TextInput label="Phone" name="phone" type="tel" maxLength={50} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Street address" name="streetAddress" maxLength={200} />
              <TextInput label="City" name="city" maxLength={100} />
              <TextInput label="State" name="state" maxLength={80} />
              <TextInput label="ZIP / Postal code" name="postalCode" maxLength={30} />
            </div>
            <SelectField label="Preferred contact method" name="preferredContactMethod" options={["Email", "Phone", "Text", "No Preference"]} />
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold text-slate-950">Puppy Preferences</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Interest type" name="interestType" options={["Current Puppy", "Upcoming Litter", "Wait List", "Not Sure Yet"]} />
              <SelectField label="Preferred coat type" name="preferredCoatType" options={["Smooth Coat", "Long Coat", "No Preference", "Undecided"]} />
              <SelectField label="Preferred gender" name="preferredGender" options={["Male", "Female", "No Preference", "Undecided"]} />
              <TextInput label="Color preference" name="colorPreference" maxLength={200} />
              <TextInput label="Desired timing" name="desiredTiming" maxLength={200} placeholder="Now, 1-3 months, future litter, etc." />
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold text-slate-950">Household And Readiness</h2>
            <TextArea label="Tell us about your household" name="householdNotes" maxLength={2000} />
            <TextArea label="Other pets" name="otherPets" maxLength={1000} />
            <TextArea label="Why are you interested in a Chihuahua?" name="readinessNotes" maxLength={2000} />
            <TextArea label="Vet reference or previous dog experience" name="vetReference" maxLength={1000} />
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold text-slate-950">Payment And Pickup Planning</h2>
            <TextArea label="Payment preference / financing interest" name="paymentPreference" maxLength={1000} placeholder="Paid in full, deposit, interested in payment plan, etc." />
            <TextArea label="Pickup, delivery, or transport notes" name="transportPreference" maxLength={1000} />
            <TextArea label="Anything else we should know?" name="additionalNotes" maxLength={2000} />
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <input type="checkbox" name="termsAcknowledged" required className="mt-1 h-4 w-4 rounded border-slate-300" />
              <span>I understand this application does not guarantee approval, reserve a puppy, or complete a purchase. I confirm the information submitted is accurate.</span>
            </label>
          </section>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">After submission, Core records the application and attempts SMTP confirmation emails.</p>
            <button type="submit" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Submit Application</button>
          </div>
        </form>
      </div>
    </main>
  );
}
