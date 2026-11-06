import { StatusBadge } from "@/components/common/status-badge"
import { VERIFICATION_STATUS, VERIFICATION_TYPES } from "@/constants/status"
import type { VerificationStatus, VerificationType } from "@/types"

const ORDER: VerificationType[] = ["contact", "identity", "property"]
const SHORT: Record<VerificationType, string> = { contact: "Contact", identity: "Identity", property: "Property" }

/** The three checks as one compact group. The badge's mark and the title carry the status, not colour alone. */
export function VerificationChecks({ verifications, compact }: { verifications: Record<VerificationType, VerificationStatus>; compact?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {ORDER.map((type) => {
        const meta = VERIFICATION_STATUS[verifications[type]]
        return (
          <li key={type} title={`${VERIFICATION_TYPES[type].label}: ${meta.label.toLowerCase()}`}>
            <StatusBadge tone={meta.tone}>
              <span>
                {SHORT[type]}
                <span className={compact ? "sr-only" : "font-normal"}>: {meta.label.toLowerCase()}</span>
              </span>
            </StatusBadge>
          </li>
        )
      })}
    </ul>
  )
}
