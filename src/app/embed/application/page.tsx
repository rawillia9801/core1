import { submitCustomerApplication } from "@/app/apply/actions";

export const dynamic = "force-dynamic";

function TextInput({ label, name, required = false, type = "text", maxLength, placeholder }: { label: string; name: string; required?: boolean; type?: string; maxLength?: number; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input type={type} name={name} required={required} maxLength={maxLength} placeholder={placeholder} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function TextArea({ label, name, maxLength, rows = 4, placeholder }: { label: string; name: string; maxLength: number; rows?: number; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea name={name} maxLength={maxLength} rows={rows} placeholder={placeholder} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select name={name} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
        <option value="">Select one</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default function EmbeddedCustomerApplicationPage() {
  return (
    <main className="min-h-screen bg-transparent px-3 py-3 text-slate-950 sm:px-4 sm:py-5">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
        <div className="bg-slate-950 px-5 py-6 text-white sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">Southwest Virginia Chihuahua</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Puppy Application</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Complete this application so we can review your home, preferences, timing, and puppy readiness.</p>
        </div>

        <form action={submitCustomerApplication} className="space-y-6 p-5 sm:p-7">
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            This application does not reserve a puppy, approve placement, collect payment, or create a customer portal account. You will receive a confirmation email after submission when email is configured.
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Applicant Contact</h2>
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

          <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <input type="checkbox" name="termsAcknowledged" required className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>I understand this application does not guarantee approval, reserve a puppy, or complete a purchase. I confirm the information submitted is accurate.</span>
          </label>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">After submission, Core records the application and attempts confirmation emails.</p>
            <button type="submit" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">Submit Application</button>
          </div>
        </form>
      </section>
    </main>
  );
}
