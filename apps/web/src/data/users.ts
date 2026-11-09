import type { LandlordProfile, RenterProfile, User } from "@/types"
import { daysAgo, hoursAgo } from "./time"

/* All people below are fictional demo accounts. */

export const DEMO_ACCOUNTS = {
  renter: "u-renter-1",
  landlord: "u-landlord-1",
  admin: "u-admin-1",
} as const

const landlordSeeds: Array<[string, string, string, number, number, User["verification"]]> = [
  ["u-landlord-1", "Teresita Santos", "dagupan", 420, 2, "verified"],
  ["u-landlord-2", "Ramon Bautista", "urdaneta", 260, 5, "verified"],
  ["u-landlord-3", "Gloria Ferrer", "lingayen", 510, 1, "verified"],
  ["u-landlord-4", "Joel Manaois", "bayambang", 90, 12, "pending"],
  ["u-landlord-5", "Mylene de Guzman", "san-carlos", 330, 3, "verified"],
  ["u-landlord-6", "Arnel Cayabyab", "alaminos", 45, 30, "pending"],
  ["u-landlord-7", "Corazon Tamayo", "binmaley", 610, 7, "verified"],
  ["u-landlord-8", "Reynaldo Lim", "dagupan", 380, 1, "verified"],
  ["u-landlord-9", "Edwin Soriano", "calasiao", 150, 20, "needs-update"],
  ["u-landlord-10", "Lourdes Aquino", "urdaneta", 470, 4, "verified"],
]

const landlordUsers: User[] = landlordSeeds.map(([id, name, municipalityId, joined, active, verification], i) => ({
  id,
  name,
  email: `${name.toLowerCase().split(" ").at(-1)}.rentals@example.ph`,
  phone: `+63 917 ${310 + i * 7} ${4100 + joined}`,
  role: "landlord",
  status: "active",
  municipalityId,
  joinedAt: daysAgo(joined),
  lastActiveAt: hoursAgo(active * 5),
  verification,
}))

const renterSeeds: Array<[string, string, string, number, number, User["status"]]> = [
  ["u-renter-1", "Mika Reyes", "dagupan", 64, 0, "active"],
  ["u-renter-2", "Paolo Mendoza", "urdaneta", 12, 1, "active"],
  ["u-renter-3", "Kristine Abalos", "lingayen", 40, 3, "active"],
  ["u-renter-4", "Jerome Villanueva", "san-carlos", 5, 2, "active"],
  ["u-renter-5", "Andrea Castillo", "dagupan", 220, 30, "deactivated"],
  ["u-renter-6", "Mark Anthony Ramos", "bayambang", 2, 0, "active"],
  ["u-renter-7", "Janelle Ocampo", "dagupan", 18, 6, "active"],
  ["u-renter-8", "Rafael Dizon", "alaminos", 90, 15, "suspended"],
  ["u-renter-9", "Bea Gonzales", "binmaley", 1, 0, "pending"],
  ["u-renter-10", "Carlo Estrada", "urdaneta", 33, 4, "active"],
  ["u-renter-11", "Nicole Perez", "dagupan", 75, 9, "active"],
  ["u-renter-12", "Joshua Lagman", "lingayen", 8, 2, "active"],
]

const renterUsers: User[] = renterSeeds.map(([id, name, municipalityId, joined, active, status]) => ({
  id,
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.ph`,
  phone: `+63 918 ${200 + joined} ${String(5100 + joined * 13).slice(0, 4)}`,
  role: "renter",
  status,
  municipalityId,
  joinedAt: daysAgo(joined),
  lastActiveAt: hoursAgo(active * 24 + 2),
  verification: joined > 30 ? "verified" : "not-started",
}))

const adminUsers: User[] = [
  {
    id: "u-admin-1",
    name: "Carla Fernandez",
    email: "carla.ops@abong.example",
    phone: "+63 917 555 0101",
    role: "admin",
    status: "active",
    joinedAt: daysAgo(700),
    lastActiveAt: hoursAgo(0),
    verification: "verified",
  },
]

export const users: User[] = [...renterUsers, ...landlordUsers, ...adminUsers]

export const renterProfiles: RenterProfile[] = [
  {
    userId: "u-renter-1",
    occupation: "student",
    universityId: "upang",
    moveInBy: "2027-01-06",
    budgetMax: 5000,
    bio: "Second-year nursing student looking for a quiet place near campus for next semester.",
  },
  { userId: "u-renter-2", occupation: "professional", workplace: "BPO, Urdaneta", budgetMax: 9000 },
  { userId: "u-renter-3", occupation: "student", universityId: "psu-lingayen", budgetMax: 3500 },
]

const verified = { identity: "verified", contact: "verified", property: "verified" } as const

export const landlordProfiles: LandlordProfile[] = [
  {
    id: "l1",
    userId: "u-landlord-1",
    displayName: "Teresita Santos",
    businessName: "Santos Residences",
    bio: "We've run boarding houses near UPang since 2009. Our caretaker lives on-site and we keep rooms simple, clean and quiet for studying.",
    municipalityId: "dagupan",
    memberSince: daysAgo(420),
    languages: ["Pangasinan", "Filipino", "English"],
    verifications: verified,
  },
  {
    id: "l2",
    userId: "u-landlord-2",
    displayName: "Ramon Bautista",
    businessName: "Bautista Apartments",
    bio: "Family-owned apartments off MacArthur Highway. Good for working professionals and small families.",
    municipalityId: "urdaneta",
    memberSince: daysAgo(260),
    languages: ["Ilocano", "Filipino", "English"],
    verifications: { identity: "verified", contact: "verified", property: "pending" },
  },
  {
    id: "l3",
    userId: "u-landlord-3",
    displayName: "Gloria Ferrer",
    bio: "Retired teacher renting out rooms in our family compound near the Capitol. Female boarders only.",
    municipalityId: "lingayen",
    memberSince: daysAgo(510),
    languages: ["Pangasinan", "Filipino"],
    verifications: verified,
  },
  {
    id: "l4",
    userId: "u-landlord-4",
    displayName: "Joel Manaois",
    businessName: "Manaois Student Dorm",
    bio: "Dorm and bedspaces a short tricycle ride from PSU Bayambang.",
    municipalityId: "bayambang",
    memberSince: daysAgo(90),
    languages: ["Pangasinan", "Filipino"],
    verifications: { identity: "pending", contact: "verified", property: "not-started" },
  },
  {
    id: "l5",
    userId: "u-landlord-5",
    displayName: "Mylene de Guzman",
    bio: "Rooms for students and teachers near VMUF. Wi-Fi and water included.",
    municipalityId: "san-carlos",
    memberSince: daysAgo(330),
    languages: ["Pangasinan", "Filipino", "English"],
    verifications: verified,
  },
  {
    id: "l6",
    userId: "u-landlord-6",
    displayName: "Arnel Cayabyab",
    bio: "Whole houses for families relocating to Alaminos.",
    municipalityId: "alaminos",
    memberSince: daysAgo(45),
    languages: ["Pangasinan", "Filipino"],
    verifications: { identity: "pending", contact: "pending", property: "not-started" },
  },
  {
    id: "l7",
    userId: "u-landlord-7",
    displayName: "Corazon Tamayo",
    businessName: "Tamayo Boarding House",
    bio: "Co-ed boarding house with separate floors for male and female boarders, near PSU Binmaley.",
    municipalityId: "binmaley",
    memberSince: daysAgo(610),
    languages: ["Pangasinan", "Filipino", "English"],
    verifications: verified,
  },
  {
    id: "l8",
    userId: "u-landlord-8",
    displayName: "Reynaldo Lim",
    businessName: "Perez Boulevard Suites",
    bio: "Managed studio and condo units in downtown Dagupan with building security and backup power.",
    municipalityId: "dagupan",
    memberSince: daysAgo(380),
    languages: ["English", "Filipino"],
    verifications: verified,
  },
  {
    id: "l9",
    userId: "u-landlord-9",
    displayName: "Edwin Soriano",
    bio: "A few family houses in Calasiao and Mangaldan.",
    municipalityId: "calasiao",
    memberSince: daysAgo(150),
    languages: ["Pangasinan", "Filipino"],
    verifications: { identity: "verified", contact: "verified", property: "needs-update" },
  },
  {
    id: "l10",
    userId: "u-landlord-10",
    displayName: "Lourdes Aquino",
    businessName: "Aquino Ladies' Dormitory",
    bio: "Ladies' dormitory beside UCU with a resident house mother and 10 PM curfew.",
    municipalityId: "urdaneta",
    memberSince: daysAgo(470),
    languages: ["Ilocano", "Pangasinan", "Filipino", "English"],
    verifications: verified,
  },
]
