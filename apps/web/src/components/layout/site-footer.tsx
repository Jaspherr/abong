import { Link } from "react-router"
import { LogoMark } from "@/components/common/logo"
import { BRAND, PATHS } from "@/constants/app"

const YEAR = new Date().getFullYear()

const COLUMNS = [
  {
    title: "Find a place",
    links: [
      { to: "/search?location=dagupan", label: "Dagupan City" },
      { to: "/search?location=urdaneta", label: "Urdaneta City" },
      { to: "/search?location=lingayen", label: "Lingayen" },
      { to: "/search?location=san-carlos", label: "San Carlos City" },
      { to: "/search?types=bedspace", label: "Bedspaces" },
    ],
  },
  {
    title: "Near schools",
    links: [
      { to: PATHS.near("phinma-upang"), label: "PHINMA UPang" },
      { to: PATHS.near("psu-lingayen"), label: "PSU Lingayen" },
      { to: PATHS.near("psu-urdaneta"), label: "PSU Urdaneta" },
      { to: PATHS.near("universidad-de-dagupan"), label: "Universidad de Dagupan" },
      { to: PATHS.schools, label: "All schools" },
    ],
  },
  {
    title: "Landlords",
    links: [
      { to: "/for-landlords", label: "List your property" },
      { to: PATHS.landlord.verification, label: "Get verified" },
      { to: PATHS.landlord.dashboard, label: "Landlord dashboard" },
    ],
  },
  {
    title: "Safety",
    links: [
      { to: "/safety", label: "Renting safely" },
      { to: "/safety#reporting", label: "Report a listing" },
      { to: "/safety#verification", label: "How verification works" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-8 bg-ink text-white/80 sm:mt-12">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-xs space-y-4">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-heading text-2xl font-bold tracking-[-0.04em] text-white">abong</span>
          </div>
          <p className="text-sm leading-relaxed text-white/70">
            {BRAND.tagline}. {BRAND.meaning}
          </p>
          <p className="text-xs leading-relaxed text-white/70">
            Never pay a reservation fee before seeing a place in person. Report listings that ask you to.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <h2 className="font-sans text-sm font-semibold tracking-normal text-white">{col.title}</h2>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-white/65 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/70 sm:flex-row sm:justify-between">
          <p>© {YEAR} {BRAND.name}. Demo build: all listings and landlords are fictional.</p>
          <p>Made for renters in Pangasinan, Philippines</p>
        </div>
      </div>
    </footer>
  )
}
