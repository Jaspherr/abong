import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VERIFICATION_TYPES } from "@/constants/status"
import { useAuth } from "@/features/auth/auth-context"
import { useLandlordId } from "@/features/landlord/queries"
import { verificationService, type ManagedProperty } from "@/services"
import type { VerificationDocument, VerificationType } from "@/types"
import { MockDocumentPicker } from "./mock-document-picker"

const ID_TYPES = ["PhilSys National ID", "Driver's license", "Passport", "UMID", "Postal ID"]
const PROPERTY_DOCS = ["Transfer certificate of title", "Tax declaration", "Barangay business permit", "Lease or management contract", "Utility bill in your name"]
const DEMO_OTP = "123456"

function useSubmit(type: VerificationType, onDone: () => void) {
  const landlordId = useLandlordId()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ docs, propertyId }: { docs: VerificationDocument[]; propertyId?: string }) => verificationService.submit(landlordId, type, docs, propertyId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["verification"] })
      client.invalidateQueries({ queryKey: ["properties"] })
      onDone()
      toast.success(`${VERIFICATION_TYPES[type].label} verification submitted`, { description: "We usually review within 1–2 working days." })
    },
    onError: () => toast.error("Submission failed. Try again."),
  })
}

function Shell({ type, open, setOpen, trigger, children, footer }: { type: VerificationType; open: boolean; setOpen: (o: boolean) => void; trigger: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Verify {VERIFICATION_TYPES[type].label.toLowerCase()}</DialogTitle>
          <DialogDescription>{VERIFICATION_TYPES[type].description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function IdentityDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [idType, setIdType] = useState(ID_TYPES[0])
  const [front, setFront] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const submit = useSubmit("identity", () => {
    setOpen(false)
    setFront(null)
    setSelfie(null)
    setAttempted(false)
  })
  return (
    <Shell
      type="identity"
      open={open}
      setOpen={setOpen}
      trigger={children}
      footer={
        <Button
          disabled={submit.isPending}
          onClick={() => {
            setAttempted(true)
            if (front && selfie)
              submit.mutate({ docs: [{ label: `${idType} (front)`, fileName: front }, { label: "Selfie holding ID", fileName: selfie }] })
          }}
        >
          {submit.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Submit for review
        </Button>
      }
    >
      <FormField label="ID type">
        <Select value={idType} onValueChange={setIdType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ID_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <MockDocumentPicker label="Front of ID" fileName={front} onChange={setFront} invalid={attempted && !front} />
      <MockDocumentPicker label="Selfie holding your ID" fileName={selfie} onChange={setSelfie} invalid={attempted && !selfie} />
      {attempted && (!front || !selfie) && <p className="text-xs text-destructive">Add both images to continue.</p>}
    </Shell>
  )
}

export function ContactDialog({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const submit = useSubmit("contact", () => setOpen(false))
  return (
    <Shell
      type="contact"
      open={open}
      setOpen={(o) => {
        setOpen(o)
        if (o) {
          setSent(false)
          setCode("")
          setError(null)
        }
      }}
      trigger={children}
      footer={
        !sent ? (
          <Button
            onClick={() => {
              setSent(true)
              toast(`Code sent to ${user?.phone}`, { description: `Demo build: use ${DEMO_OTP}.` })
            }}
          >
            Send code
          </Button>
        ) : (
          <Button
            disabled={submit.isPending}
            onClick={() => {
              if (code !== DEMO_OTP) return setError("That code doesn't match. Check the SMS and try again.")
              submit.mutate({ docs: [{ label: "Mobile number OTP", fileName: "otp-confirmed" }] })
            }}
          >
            {submit.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Verify number
          </Button>
        )
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-muted px-4 py-3 text-sm">
        <dt className="text-muted-foreground">Mobile</dt>
        <dd className="font-medium">{user?.phone}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd className="font-medium">{user?.email}</dd>
      </dl>
      {sent && (
        <FormField label="6-digit code" error={error ?? undefined} hint={`Demo build: the code is ${DEMO_OTP}.`}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""))
              setError(null)
            }}
            className="tracking-[0.4em] tabular"
          />
        </FormField>
      )}
    </Shell>
  )
}

export function PropertyDialog({ properties, defaultPropertyId, children }: { properties: ManagedProperty[]; defaultPropertyId?: string; children: ReactNode }) {
  const [open, setOpen] = useState(Boolean(defaultPropertyId))
  const [chosenId, setPropertyId] = useState(defaultPropertyId)
  // The list shrinks as properties go to review, so a remembered choice may no longer be in it.
  const propertyId = properties.some((p) => p.id === chosenId) ? (chosenId ?? "") : (properties[0]?.id ?? "")
  const [docType, setDocType] = useState(PROPERTY_DOCS[0])
  const [file, setFile] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const submit = useSubmit("property", () => {
    setOpen(false)
    setFile(null)
    setAttempted(false)
  })
  return (
    <Shell
      type="property"
      open={open}
      setOpen={setOpen}
      trigger={children}
      footer={
        <Button
          disabled={submit.isPending || !propertyId}
          onClick={() => {
            setAttempted(true)
            if (file) submit.mutate({ docs: [{ label: docType, fileName: file }], propertyId })
          }}
        >
          {submit.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Submit for review
        </Button>
      }
    >
      {properties.length === 0 ? (
        <p className="text-sm text-muted-foreground">All your properties are verified or already in review.</p>
      ) : (
        <>
          <FormField label="Property">
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Document">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_DOCS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <MockDocumentPicker label={docType} fileName={file} onChange={setFile} invalid={attempted && !file} />
        </>
      )}
    </Shell>
  )
}
