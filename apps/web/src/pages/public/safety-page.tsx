import { useDocumentTitle } from "@/hooks/use-document-title"

const SECTIONS = [
  {
    id: "before",
    title: "Before you pay anything",
    points: [
      "See the room in person, or have someone you trust visit for you.",
      "Pay advance and deposit only on move-in, after you've signed a written agreement.",
      "Ask for an official receipt for every payment.",
      "Be wary of “reservation fees” requested before a viewing. Legitimate landlords on Abong don't need them.",
    ],
  },
  {
    id: "verification",
    title: "How verification works",
    points: [
      "Identity: the landlord submits a government-issued ID that our team checks against their account.",
      "Contact: the landlord confirms their mobile number and email.",
      "Property: the landlord shows they own or manage the property, for example with a barangay permit, title or utility bill.",
      "The Verified badge appears only when both identity and property checks pass.",
    ],
  },
  {
    id: "reporting",
    title: "Reporting a listing",
    points: [
      "Use “Report listing” at the bottom of any listing page.",
      "Choose a reason and tell us what happened. Include dates and amounts if money was requested.",
      "Reports are confidential and reviewed by the Abong team, usually within 24 hours.",
      "Listings under investigation can be suspended while we check.",
    ],
  },
]

function SafetyPage() {
  useDocumentTitle("Renting safely")
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="type-page-title">Renting safely on Abong</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Most rental problems start with a payment made too early. These are the habits that protect renters, and how we
        check landlords.
      </p>
      <div className="mt-12 space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24" aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`} className="type-section-title">
              {section.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {section.points.map((point) => (
                <li key={point} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export { SafetyPage as Component }
