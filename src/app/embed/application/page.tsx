import { submitCustomerApplication } from "@/app/apply/actions";

export const dynamic = "force-dynamic";

function TextInput({ label, name, required = false, type = "text", maxLength, placeholder }: { label: string; name: string; required?: boolean; type?: string; maxLength?: number; placeholder?: string }) {
  return (
    <label className="block text-sm font-semibold text-[#201814]">
      {label}{required ? <span className="text-[#c16a22]"> *</span> : null}
      <input type={type} name={name} required={required} maxLength={maxLength} placeholder={placeholder} className="mt-2 block w-full rounded-2xl border border-[#e6ded5] bg-white px-4 py-3 text-sm font-normal text-[#201814] outline-none transition placeholder:text-[#b7aaa0] focus:border-[#d88429] focus:ring-2 focus:ring-[#f6d79f]" />
    </label>
  );
}

function TextArea({ label, name, maxLength, rows = 4, required = false, placeholder }: { label: string; name: string; maxLength: number; rows?: number; required?: boolean; placeholder?: string }) {
  return (
    <label className="block text-sm font-semibold text-[#201814]">
      {label}{required ? <span className="text-[#c16a22]"> *</span> : null}
      <textarea name={name} maxLength={maxLength} rows={rows} required={required} placeholder={placeholder} className="mt-2 block w-full rounded-2xl border border-[#e6ded5] bg-white px-4 py-3 text-sm font-normal text-[#201814] outline-none transition placeholder:text-[#b7aaa0] focus:border-[#d88429] focus:ring-2 focus:ring-[#f6d79f]" />
    </label>
  );
}

function SelectField({ label, name, required = false, options }: { label: string; name: string; required?: boolean; options: string[] }) {
  return (
    <label className="block text-sm font-semibold text-[#201814]">
      {label}{required ? <span className="text-[#c16a22]"> *</span> : null}
      <select name={name} required={required} className="mt-2 block w-full rounded-2xl border border-[#e6ded5] bg-white px-4 py-3 text-sm font-normal text-[#201814] outline-none transition focus:border-[#d88429] focus:ring-2 focus:ring-[#f6d79f]">
        <option value="">Select one</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function RadioGroup({ label, name, options, required = false }: { label: string; name: string; options: string[]; required?: boolean }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-[#201814]">{label}{required ? <span className="text-[#c16a22]"> *</span> : null}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-full border border-[#e6ded5] bg-white px-4 py-2 text-sm text-[#33241c] shadow-sm">
            <input type="radio" name={name} value={option} required={required} className="h-4 w-4 border-[#d88429] text-[#d88429]" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-t border-[#eadfd1] pt-7 first:border-t-0 first:pt-0">
      {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#b65f16]">{eyebrow}</p> : null}
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#18110d]">{title}</h2>
      {children}
    </section>
  );
}

function TermsBox() {
  return (
    <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-[#d9cec2] bg-[#fffdf8] p-5 text-sm leading-6 text-[#30241d] shadow-inner">
      <p><strong>Please read these Terms and Conditions carefully before submitting your Puppy Adoption Application to Southwest Virginia Chihuahua.</strong> By clicking “I Agree” and submitting this application, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
      <h3 className="mt-5 font-bold">1. Application Process</h3>
      <p><strong>Incomplete or Incorrect Information.</strong> You agree to provide complete, accurate, and truthful information. False, incomplete, or misleading information may result in disqualification or other action at our sole discretion.</p>
      <p><strong>Non-Binding Application.</strong> Submission of an application does not guarantee approval or reservation of any puppy. All applications are subject to breeder review and approval.</p>
      <p><strong>Application Fee.</strong> There is no separate application fee. If approved, a nonrefundable $250 deposit will be required to reserve a puppy.</p>
      <h3 className="mt-5 font-bold">2. Deposit and Reservation</h3>
      <p>If approved, we will provide instructions to pay a nonrefundable $250 deposit. A puppy is reserved only after cleared deposit payment. The deposit is nonrefundable under all circumstances and is applied toward the total purchase price.</p>
      <h3 className="mt-5 font-bold">3. Approval, Rejection, and Wait List</h3>
      <p>We evaluate household environment, reason for adoption, ability to provide lifelong care, and understanding of Chihuahua-specific needs. We reserve the right to reject any application for any reason. Wait list placement does not guarantee future availability.</p>
      <h3 className="mt-5 font-bold">4. Privacy and Data Use</h3>
      <p>By submitting this application, you authorize Southwest Virginia Chihuahua to collect, store, and use your personal information for application review, reservation processing, and post-adoption support. We do not share your personal data except as required by law or as necessary to complete transactions.</p>
      <p><strong>Communications.</strong> You consent to receive email, text, or phone communications regarding application status, payment instructions, puppy updates, and appointments.</p>
      <h3 className="mt-5 font-bold">5. Health Guarantee and Contractual Terms</h3>
      <p>Approved buyers will receive the Puppy Sales Agreement and Health Guarantee. The agreement outlines purchase price, Virginia sales tax, payment schedules, breeder and buyer responsibilities, health guarantee terms, veterinary check requirements, return policies, and conditions that may void the guarantee.</p>
      <h3 className="mt-5 font-bold">6. Ownership Transfer and Delivery</h3>
      <p>The remaining balance plus applicable tax must be paid in full before transfer. Puppies are released through scheduled hand-off, professional shipment, or courier/transport service. Ownership transfers only after full payment and signed contract.</p>
      <h3 className="mt-5 font-bold">7. Post-Approval Responsibilities</h3>
      <p>You agree to have the puppy examined by a licensed veterinarian within ten days of possession, provide ongoing veterinary care, nutrition, grooming, parasite prevention, and lifelong support. If you cannot keep the puppy, Southwest Virginia Chihuahua must be contacted first.</p>
      <h3 className="mt-5 font-bold">8. Liability and Disclaimers</h3>
      <p>Except as expressly stated in the Health Guarantee, the puppy is sold “as is.” Southwest Virginia Chihuahua, its owners, employees, and agents are not liable for incidental, consequential, or punitive damages related to application, adoption, or ownership.</p>
      <h3 className="mt-5 font-bold">9. Governing Law and Dispute Resolution</h3>
      <p>These Terms are governed by Virginia law. Disputes must first be addressed in good faith informally, then through mediation if needed. If mediation fails, remedies may be pursued in state or federal courts located in Smyth County, Virginia.</p>
      <h3 className="mt-5 font-bold">10. Miscellaneous</h3>
      <p>If any provision is invalid, remaining terms remain in effect. No waiver is continuing. We may update these Terms on swvachihuahua.com.</p>
    </div>
  );
}

function DeclarationList() {
  const items = [
    ["Age and Capacity", "I declare that I am at least 18 years of age and legally competent to enter into contracts."],
    ["Accuracy of Information", "I declare that all information provided is complete, accurate, and truthful to the best of my knowledge."],
    ["Home Environment & Pet Ownership", "I declare that I have permission to keep a dog at my residence and that my home is suitable for a Chihuahua puppy."],
    ["Puppy Care Commitment", "I am committed to proper nutrition, veterinary care, grooming, exercise, socialization, and lifelong care."],
    ["Health Guarantee Understanding", "I agree to have the puppy examined by a licensed veterinarian within 10 days and understand failure to comply may void the health guarantee."],
    ["Nonrefundable Deposit", "If approved, I understand I will pay a nonrefundable $250 deposit to reserve the puppy."],
    ["Purchase Price & Tax", "I understand purchase price varies per puppy, Virginia sales tax is calculated separately, and the balance must be paid before possession."],
    ["Contractual Obligation", "I understand no puppy will be released until the signed agreement and all payments are complete."],
    ["Return & Re-homing Policy", "If unable to care for the puppy, I will contact Southwest Virginia Chihuahua before selling, transferring, surrendering, or re-homing."],
    ["Release of Liability", "I understand Southwest Virginia Chihuahua is not liable for illness, injury, veterinary costs, property damage, or personal injury after transfer."],
    ["Agreement to Policies", "I have read, understand, and agree to the Terms and Conditions, Privacy Policy, and puppy adoption policies."],
    ["Consent to Communications", "I consent to emails, text messages, and phone calls regarding my application and adoption-related communications."],
  ];

  return (
    <div className="rounded-2xl border border-[#eadfd1] bg-[#fffdf8] p-5 text-sm leading-6 text-[#30241d]">
      <ol className="list-decimal space-y-4 pl-5">
        {items.map(([title, text]) => <li key={title}><strong>{title}.</strong> {text}</li>)}
      </ol>
    </div>
  );
}

export default function EmbeddedCustomerApplicationPage() {
  return (
    <main className="min-h-screen bg-transparent px-2 py-2 text-[#18110d] sm:px-3 sm:py-4">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#eadfd1] bg-white shadow-xl shadow-[#3a2312]/10">
        <div className="border-b border-[#eadfd1] bg-[linear-gradient(135deg,#fff7da_0%,#fffdf8_50%,#f9eee0_100%)] px-5 py-8 sm:px-8">
          <p className="inline-flex rounded-full border border-[#e0b55f] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#a65310]">Puppy Application</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-[#18110d] sm:text-5xl">Southwest Virginia Chihuahua</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4a3b32]">Please complete the application below. Fields marked with an asterisk are required.</p>
        </div>

        <form action={submitCustomerApplication} className="space-y-8 p-5 sm:p-8">
          <input type="hidden" name="returnTo" value="/embed/application/received" />

          <Section eyebrow="Section 1" title="Applicant Info">
            <TextInput label="First and Last Name" name="applicantFullName" required maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Email Address" name="email" type="email" required maxLength={320} />
              <TextInput label="Phone Number" name="phone" type="tel" maxLength={50} />
            </div>
            <TextArea label="Street Address" name="streetAddress" maxLength={200} rows={3} />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextInput label="City" name="city" maxLength={100} />
              <SelectField label="State" name="state" required options={["VA", "NC", "TN", "WV", "SC", "KY", "MD", "PA", "OH", "Other"]} />
              <TextInput label="Zip Code" name="postalCode" maxLength={30} />
            </div>
            <SelectField label="Preferred Contact Method" name="preferredContactMethod" options={["Email", "Phone", "Text", "No Preference"]} />
          </Section>

          <Section title="Puppy Preferences">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Preferred Coat Type" name="preferredCoatType" options={["Smooth Coat", "Long Coat", "No Preference", "Undecided"]} />
              <SelectField label="Preferred Gender" name="preferredGender" options={["Male", "Female", "No Preference", "Undecided"]} />
              <TextInput label="Color Preference" name="colorPreference" maxLength={200} />
              <TextInput label="Desired Adoption Date" name="desiredAdoptionDate" type="date" maxLength={40} />
            </div>
            <RadioGroup label="Interest Type" name="interestType" options={["Current Puppy", "Future Puppy", "Wait List"]} />
          </Section>

          <Section title="Lifestyle & Home">
            <SelectField label="Do You Have Other Pets?" name="otherPets" options={["Yes", "No"]} />
            <TextArea label="Pet Details" name="petDetails" maxLength={1500} rows={4} />
            <RadioGroup label="Owned A Chihuahua Before?" name="ownedChihuahuaBefore" options={["Yes", "No"]} />
            <SelectField label="Home Type" name="homeType" options={["House", "Apartment", "Townhome", "Farm/Rural Property", "Other"]} />
            <RadioGroup label="Fenced Yard?" name="fencedYard" options={["Yes", "No"]} />
            <SelectField label="Work Status" name="workStatus" options={["Full Time", "Part Time", "Work From Home", "Retired", "Not Currently Working", "Other"]} />
            <TextInput label="Who Cares for Puppy?" name="puppyCaregiver" maxLength={300} />
            <TextArea label="Children at Home" name="childrenAtHome" maxLength={1000} rows={3} />
          </Section>

          <Section title="Payment & Agreement">
            <SelectField label="Payment Preference" name="paymentPreference" options={["Pay in Full", "Deposit then Balance", "Interested in Payment Plan", "Undecided"]} />
            <SelectField label="How Did You Hear About Us?" name="howHeard" options={["Website", "Facebook", "Good Dog", "Referral", "Google", "Previous Customer", "Other"]} />
            <RadioGroup label="Ready to Place Deposit?" name="readyDeposit" options={["Yes", "No"]} />
            <TextArea label="Please input any questions that you may have here." name="questions" maxLength={2000} rows={4} />
          </Section>

          <Section title="Terms and Conditions">
            <TermsBox />
            <label className="flex gap-3 rounded-2xl border border-[#eadfd1] bg-[#fffdf8] p-4 text-sm leading-6 text-[#30241d]">
              <input type="checkbox" name="termsAcknowledged" required className="mt-1 h-4 w-4 rounded border-[#d88429] text-[#d88429]" />
              <span>I have read, understand, and agree to the Terms and Conditions.</span>
            </label>
          </Section>

          <Section title="Applicant Declarations">
            <DeclarationList />
            <label className="flex gap-3 rounded-2xl border border-[#eadfd1] bg-[#fffdf8] p-4 text-sm leading-6 text-[#30241d]">
              <input type="checkbox" name="declarationsAcknowledged" required className="mt-1 h-4 w-4 rounded border-[#d88429] text-[#d88429]" />
              <span>I confirm that the applicant declarations are true and that I agree to abide by them.</span>
            </label>
          </Section>

          <Section title="Signature">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Date-Time" name="signedAt" type="datetime-local" maxLength={80} />
              <TextInput label="Signature" name="signature" required maxLength={200} placeholder="Type your full legal name" />
            </div>
            <p className="text-sm leading-6 text-[#6b5a4d]">Typing your full legal name serves as your electronic signature.</p>
          </Section>

          <div className="flex flex-col gap-3 border-t border-[#eadfd1] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[#6b5a4d]">After submission, you should receive a confirmation email.</p>
            <button type="submit" className="rounded-full bg-[#17120f] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#34251d]">Submit Application</button>
          </div>
        </form>
      </section>
    </main>
  );
}
