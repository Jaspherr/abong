import { expect, test, type Page } from "@playwright/test"

/** Signs in through the demo buttons on the login page, as a reviewer would. */
async function signInAs(page: Page, role: "renter" | "landlord" | "admin") {
  await page.goto("/login")
  await page.getByRole("button", { name: new RegExp(`Continue as ${role}`, "i") }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}

test.beforeEach(async ({ page }) => {
  // Each test starts from the seed dataset.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-init")) {
      localStorage.clear()
      sessionStorage.setItem("e2e-init", "1")
    }
  })
})

test("search from the homepage and open a listing", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1, name: "Find your place in Pangasinan." })).toBeVisible()

  await page.getByRole("link", { name: "Near PHINMA UPang" }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: /near PHINMA UPang/ })).toBeVisible()

  await page.goto("/search?location=dagupan")
  await expect(page.getByRole("heading", { level: 1, name: /places? to rent in Dagupan City/ })).toBeVisible()
  await page.getByRole("link", { name: "Santos Boarding House" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Santos Boarding House" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Rooms and availability" })).toBeVisible()
})

test("near schools in the navbar opens the school list from any page", async ({ page, isMobile }) => {
  await page.goto("/safety")
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("link", { name: "Near schools", exact: true }).click()

  await expect(page).toHaveURL(/\/near$/)
  await expect(page.getByRole("heading", { level: 1, name: "Find a place near your school" })).toBeVisible()

  await page.getByRole("main").getByRole("link", { name: /PHINMA UPang/ }).click()
  await expect(page.getByRole("heading", { level: 1, name: /near PHINMA UPang/ })).toBeVisible()
})

test("filters narrow results and are reflected in the URL", async ({ page, isMobile }) => {
  await page.goto("/search?location=dagupan")
  await page.getByRole("button", { name: /^Filters/ }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByText("Dormitory", { exact: true }).click()
  await sheet.getByRole("button", { name: /Show 1 place/ }).click()

  await expect(page).toHaveURL(/types=dormitory/)
  await expect(page.getByRole("heading", { level: 1, name: "1 place to rent in Dagupan City" })).toBeVisible()
  if (!isMobile) await expect(page.getByRole("button", { name: "Remove filter: Dormitory" })).toBeVisible()
})

test("guests are sent to sign in from renter pages", async ({ page }) => {
  await page.goto("/inquiries")
  await expect(page).toHaveURL(/\/login\?next=%2Finquiries/)
})

test("renter can message a landlord from a listing", async ({ page }) => {
  await signInAs(page, "renter")
  await page.goto("/listing/ferrer-compound")
  await page.getByRole("button", { name: /^Message/ }).first().click()

  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Your message").fill("Hello po! Is the garden room available from January?")
  await dialog.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByText(/Message sent to Gloria Ferrer/)).toBeVisible()

  await page.goto("/inquiries")
  await expect(page.getByText("Ferrer Compound Rooms").first()).toBeVisible()
})

test("landlord sees dashboard and can mark a unit occupied", async ({ page }) => {
  await signInAs(page, "landlord")
  await expect(page.getByRole("heading", { level: 1, name: /Teresita/ })).toBeVisible()

  await page.goto("/landlord/properties/santos-boarding-house")
  await page.getByRole("combobox", { name: "Status of Studio A" }).click()
  await page.getByRole("option", { name: "Occupied" }).click()
  await expect(page.getByText("Studio A marked occupied")).toBeVisible()
})

test("every landlord page opens under the shared header", async ({ page }) => {
  await signInAs(page, "landlord")
  for (const [path, title] of [
    ["/landlord/dashboard", /Teresita/],
    ["/landlord/properties", "Properties and units"],
    ["/landlord/properties/new", "Add a property"],
    ["/landlord/properties/santos-boarding-house", "Santos Boarding House"],
    ["/landlord/listings", "Listings"],
    ["/landlord/inquiries", "Inquiries"],
    ["/landlord/viewings", "Viewing requests"],
    ["/landlord/verification", "Verification"],
    ["/landlord/profile", "Profile"],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole("main")).toHaveCount(1)
    const overflow = await page.evaluate<number>("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    expect(overflow).toBeLessThanOrEqual(0)
  }
})

test("add property lives with the properties, not in the header", async ({ page }) => {
  await signInAs(page, "landlord")
  await expect(page.getByRole("banner").getByRole("link", { name: "Add property" })).toHaveCount(0)
  await page.getByRole("region", { name: "Occupancy by property" }).getByRole("link", { name: "Add property" }).click()
  await expect(page).toHaveURL(/\/landlord\/properties\/new$/)

  await page.goto("/landlord/properties")
  await expect(page.getByRole("banner").getByRole("link", { name: "Add property" })).toHaveCount(0)
  await page.getByRole("main").getByRole("link", { name: "Add property" }).click()
  await expect(page).toHaveURL(/\/landlord\/properties\/new$/)
})

test("landlord handles what's waiting from the dashboard", async ({ page }) => {
  await signInAs(page, "landlord")
  const todo = page.getByRole("region", { name: "Needs you" })
  await expect(todo.getByText("Nicole Perez wants to visit")).toBeVisible()
  const row = todo.getByRole("listitem").filter({ hasText: "Nicole Perez wants to visit" })
  await row.getByRole("button", { name: "Confirm" }).click()
  await expect(page.getByText("Viewing confirmed with Nicole Perez")).toBeVisible()
  await expect(todo.getByText("Nicole Perez wants to visit")).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Coming up" }).getByText("Nicole Perez")).toBeVisible()
})

test("landlord can confirm, reschedule and decline viewing requests", async ({ page }) => {
  await signInAs(page, "landlord")
  await page.goto("/landlord/viewings")
  const row = (name: string) => page.getByRole("article").filter({ hasText: name })

  await row("Nicole Perez").getByRole("button", { name: "Reschedule" }).click()
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Suggest a new time" })).toBeVisible()
  await page.keyboard.press("Escape")

  await row("Nicole Perez").getByRole("button", { name: "Decline" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Decline request" }).click()
  await expect(page.getByText("Request declined")).toBeVisible()

  await row("Janelle Ocampo").getByRole("button", { name: "Confirm" }).click()
  await expect(page.getByText("Viewing confirmed with Janelle Ocampo")).toBeVisible()

  await page.getByRole("tab", { name: /Upcoming/ }).click()
  await row("Janelle Ocampo").getByRole("button", { name: "Mark completed" }).click()
  await expect(page.getByText("Marked as completed")).toBeVisible()

  await page.getByRole("tab", { name: /Past/ }).click()
  await expect(row("Janelle Ocampo")).toBeVisible()
  await expect(row("Nicole Perez")).toBeVisible()
})

test("landlord can search and filter properties and listings", async ({ page }) => {
  await signInAs(page, "landlord")
  await page.goto("/landlord/properties")
  await page.getByRole("searchbox", { name: "Search properties" }).fill("annex")
  await expect(page.getByRole("heading", { name: "Santos Annex" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Santos Boarding House" })).toHaveCount(0)
  await page.getByRole("tab", { name: /Live/ }).click()
  await expect(page.getByText("No properties match")).toBeVisible()

  await page.goto("/landlord/listings")
  await page.getByRole("button", { name: "Confirm availability for Santos Boarding House" }).click()
  await expect(page.getByText("Availability confirmed for Santos Boarding House")).toBeVisible()
  await page.getByRole("tab", { name: /Drafts and archived/ }).click()
  await expect(page.getByText("Santos Annex")).toBeVisible()
  await expect(page.getByText("Santos Boarding House")).toHaveCount(0)
})

test("landlord can add a property, then edit and archive it", async ({ page }) => {
  await signInAs(page, "landlord")
  await page.goto("/landlord/properties/new")

  // Validation still blocks an empty form and sends focus to the first problem.
  await page.getByRole("button", { name: "Save and add units" }).click()
  await expect(page.getByLabel("Property name")).toBeFocused()
  await expect(page.getByText("Give the property a name renters will recognise.")).toBeVisible()

  await page.getByLabel("Property name").fill("Test Boarding House")
  await page.getByRole("combobox", { name: /Property type/ }).click()
  await page.getByRole("option").first().click()
  await page.getByLabel("Short headline").fill("Quiet rooms near the plaza")
  await page.getByLabel("Description").fill("A quiet boarding house near the plaza, run by the owner's family.")
  await page.getByRole("combobox", { name: /City or town/ }).click()
  await page.getByRole("option").first().click()
  await page.getByLabel("Barangay").fill("Poblacion")
  await page.getByLabel("ZIP code").fill("2400")
  await page.locator('input[type="file"]').first().setInputFiles({ name: "room.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") })
  await page.getByRole("button", { name: "Save and add units" }).click()

  await expect(page).toHaveURL(/\/landlord\/properties\/(?!new)/)
  await expect(page.getByRole("heading", { level: 1, name: "Test Boarding House" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled()

  await page.getByRole("tab", { name: "Property details" }).click()
  await page.getByLabel("Property name").fill("Test Boarding House Two")
  await page.getByRole("button", { name: "Discard changes" }).click()
  await expect(page.getByLabel("Property name")).toHaveValue("Test Boarding House")
  await page.getByLabel("Property name").fill("Test Boarding House Two")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Changes saved")).toBeVisible()
  await expect(page.getByRole("heading", { level: 1, name: "Test Boarding House Two" })).toBeVisible()

  await page.getByRole("tab", { name: /Units/ }).click()
  await page.getByRole("button", { name: "Archive property" }).click()
  await expect(page.getByText("Property archived")).toBeVisible()
  await page.getByRole("button", { name: "Restore as draft" }).click()
  await expect(page.getByText("Restored as draft")).toBeVisible()
})

test("landlord profile saves and validates", async ({ page }) => {
  await signInAs(page, "landlord")
  await page.goto("/landlord/profile")
  await page.getByLabel("Display name").fill("Te")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Enter the name renters will see.")).toBeVisible()
  await page.getByLabel("Display name").fill("Teresita S.")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved")).toBeVisible()
  await expect(page.getByRole("link", { name: "Verification" })).toBeVisible()
})

test("admin can approve a listing in the moderation queue", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/listings?review=lingayen-beach-apartment")
  await expect(page.getByRole("heading", { name: "Estanza Apartment" })).toBeVisible()
  await page.getByRole("button", { name: "Approve" }).click()
  await expect(page.getByText("Listing approved and live")).toBeVisible()
})

test("every admin page opens without page overflow", async ({ page }) => {
  await signInAs(page, "admin")
  for (const [path, title] of [
    ["/admin", "Overview"],
    ["/admin/listings", "Listing moderation"],
    ["/admin/verifications", "Verifications"],
    ["/admin/reports", "Reports"],
    ["/admin/users", "Users"],
    ["/admin/landlords", "Landlords"],
    ["/admin/analytics", "Analytics"],
    ["/admin/profile", "Profile"],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole("main")).toHaveCount(1)
    const overflow = await page.evaluate<number>("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    expect(overflow).toBeLessThanOrEqual(0)
  }
})

test("the overview links straight to a waiting item", async ({ page }) => {
  await signInAs(page, "admin")
  const queue = page.getByRole("region", { name: "Listings to review" })
  await queue.getByRole("link", { name: /Estanza Apartment/ }).click()
  await expect(page).toHaveURL(/\/admin\/listings\?review=/)
  await expect(page.getByRole("heading", { name: "Estanza Apartment" })).toBeVisible()
})

test("rejecting a listing needs a note, then the review moves on", async ({ page, isMobile }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/listings?review=lingayen-beach-apartment")
  await page.getByRole("button", { name: "Reject" }).click()
  await expect(page.getByText("Add a note of at least 10 characters")).toBeVisible()
  await page.getByLabel("Note to landlord").fill("Photos don't match the address.")
  await page.getByRole("button", { name: "Reject" }).click()
  await expect(page.getByText("Listing rejected")).toBeVisible()
  if (!isMobile) {
    // With the queue beside the review, the next listing opens by itself.
    await expect(page).toHaveURL(/review=/)
    await expect(page).not.toHaveURL(/review=lingayen-beach-apartment/)
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible()
  }
  await page.goto("/admin/listings")
  await page.getByRole("tab", { name: /Rejected/ }).click()
  await expect(page.getByRole("list", { name: "Listings" }).getByText("Estanza Apartment")).toBeVisible()
})

test("opening an item far down a long queue shows it on screen", async ({ page, isMobile }) => {
  test.skip(isMobile, "On phones the item opens in a sheet, which always covers the screen.")
  await signInAs(page, "admin")
  await page.goto("/admin/listings")
  await page.getByRole("tab", { name: /^All/ }).click()
  const rows = page.getByRole("list", { name: "Listings" }).getByRole("button")
  await expect(rows.nth(20)).toBeVisible()
  const last = rows.last()
  const name = (await last.locator("span").first().textContent())?.trim() ?? ""
  await last.click()
  const review = page.getByRole("region", { name: "Listing review" })
  await expect(review.getByRole("heading", { level: 2 })).toBeInViewport()
  await expect(page).toHaveURL(/review=/)
  expect(name).toContain(await review.getByRole("heading", { level: 2 }).textContent())
  // The page itself doesn't need to scroll to work the queue.
  const { scrollHeight, clientHeight } = await page.locator("html").evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
})

test("archiving a live listing asks first", async ({ page, isMobile }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/listings")
  await page.getByRole("tab", { name: /Active/ }).click()
  await page.getByRole("list", { name: "Listings" }).getByRole("button").first().click()
  await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible()
  await page.getByRole("button", { name: "Archive", exact: true }).click()
  const confirm = page.getByRole("alertdialog")
  await confirm.getByRole("button", { name: "Keep listing" }).click()
  await expect(confirm).toHaveCount(0)
  await page.getByRole("button", { name: "Archive", exact: true }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive listing" }).click()
  await expect(page.getByText("Listing archived")).toBeVisible()
  if (isMobile) await expect(page.getByRole("button", { name: "Archive", exact: true })).toHaveCount(0)
})

test("admin reviews a verification, and rejecting needs a note", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/verifications")
  await page.getByRole("list", { name: "Verification requests" }).getByRole("button").first().click()
  await page.getByRole("button", { name: "Request update" }).click()
  await expect(page.getByText("Explain what's wrong so the landlord can fix it.")).toBeVisible()
  await page.getByLabel("Note to landlord").fill("The ID photo is too blurry to read.")
  await page.getByRole("button", { name: "Request update" }).click()
  await expect(page.getByText("Asked landlord for an update")).toBeVisible()
  await page.goto("/admin/verifications")
  await page.getByRole("list", { name: "Verification requests" }).getByRole("button").first().click()
  await page.getByRole("button", { name: "Approve" }).click()
  await expect(page.getByText("Marked as verified")).toBeVisible()
  await page.goto("/admin/verifications")
  await page.getByRole("tab", { name: "Reviewed" }).click()
  await expect(page.getByRole("list", { name: "Verification requests" }).getByRole("button").first()).toBeVisible()
})

test("admin works a report from investigating to resolved", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/reports")
  const reports = page.getByRole("list", { name: "Reports" })
  await expect(reports.getByRole("button").first()).toBeVisible()
  const openCount = await reports.getByRole("button").count()
  await reports.getByRole("button").first().click()
  const start = page.getByRole("button", { name: "Start investigating" })
  if (await start.isVisible()) {
    await start.click()
    await expect(page.getByText("Report investigating")).toBeVisible()
  }
  await page.getByLabel("Resolution note").fill("Checked with the landlord and corrected the listing.")
  await page.getByRole("button", { name: "Mark resolved" }).click()
  await expect(page.getByText("Report resolved")).toBeVisible()
  await page.goto("/admin/reports")
  await expect(reports.getByRole("button")).toHaveCount(openCount - 1)
  await page.getByRole("tab", { name: "Closed" }).click()
  await expect(reports.getByRole("button").first()).toBeVisible()
})

test("admin can search, filter and suspend users, with a confirmation", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/users")
  await page.getByRole("searchbox", { name: "Search users" }).fill("mika")
  await expect(page.getByRole("button", { name: "Actions for Mika Reyes" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible()

  await page.getByRole("button", { name: "Actions for Mika Reyes" }).click()
  await page.getByRole("menuitem", { name: "Suspend account" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep account active" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)

  await page.getByRole("button", { name: "Actions for Mika Reyes" }).click()
  await page.getByRole("menuitem", { name: "Suspend account" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Suspend account" }).click()
  await expect(page.getByText("Mika Reyes is now suspended")).toBeVisible()

  await page.getByRole("button", { name: "Actions for Mika Reyes" }).click()
  await page.getByRole("menuitem", { name: "Reactivate account" }).click()
  await expect(page.getByText("Mika Reyes is now active")).toBeVisible()

  await page.getByRole("button", { name: "Clear filters" }).click()
  await page.getByRole("combobox", { name: "Filter by role" }).click()
  await page.getByRole("option", { name: "Admins" }).click()
  // Admin accounts offer no actions at all, on either layout.
  await expect(page.getByRole("img", { name: /is an admin/ }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Actions for/ })).toHaveCount(0)
})

/** Waits for the demo database to reach storage, so a change survives the next page load. */
async function savedContains(page: Page, text: string) {
  await expect.poll(() => page.evaluate(() => localStorage.getItem("abong:demo-db:v1") ?? "")).toContain(text)
}

/** The same, for one account. Seed data already holds other suspended records, so a text match isn't enough. */
async function savedAccountStatus(page: Page, userId: string, status: string) {
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const db = JSON.parse(localStorage.getItem("abong:demo-db:v1") ?? "{}") as { users?: Array<{ id: string; status: string }> }
        return db.users?.find((user) => user.id === id)?.status
      }, userId),
    )
    .toBe(status)
}

test("a suspended account is signed out on the next visit", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/users")
  await page.getByRole("searchbox", { name: "Search users" }).fill("mika")
  await page.getByRole("button", { name: "Actions for Mika Reyes" }).click()
  await page.getByRole("menuitem", { name: "Suspend account" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Suspend account" }).click()
  await expect(page.getByText("Mika Reyes is now suspended")).toBeVisible()
  await savedAccountStatus(page, "u-renter-1", "suspended")

  // Mika's session is still on this device.
  await page.evaluate(() => localStorage.setItem("abong:session", "u-renter-1"))
  await page.goto("/inquiries")
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole("button", { name: /Continue as renter/i }).click()
  await expect(page.getByText("This demo account is suspended")).toBeVisible()
})

test("a moderation note reaches the landlord, and approval clears it", async ({ page }) => {
  const note = "Photos don't match the address."
  await signInAs(page, "admin")
  await page.goto("/admin/listings?review=santos-boarding-house")
  await page.getByLabel("Note to landlord").fill(note)
  await page.getByRole("button", { name: "Suspend" }).click()
  await expect(page.getByText("Listing suspended")).toBeVisible()
  await savedContains(page, note.slice(0, 12))

  await signInAs(page, "landlord")
  await page.goto("/landlord/properties/santos-boarding-house")
  await expect(page.getByText(note)).toBeVisible()
})

test("a school's count matches the places on its page", async ({ page }) => {
  await page.goto("/near")
  const card = page.getByRole("main").getByRole("link", { name: /PHINMA UPang/ })
  const label = (await card.textContent()) ?? ""
  const count = /(\d+) places? nearby/.exec(label)?.[1]
  expect(count).toBeTruthy()
  await card.click()
  await expect(page.getByText("Places within 5 km").locator("xpath=following-sibling::dd")).toHaveText(count as string)
})

test("a live listing can't lose its last unit", async ({ page }) => {
  await signInAs(page, "landlord")
  await page.goto("/landlord/properties/santos-residence-tapuac")
  const deletes = page.getByRole("button", { name: /^Delete / })
  await expect(deletes.first()).toBeVisible()
  for (let left = await deletes.count(); left > 1; left--) {
    await deletes.first().click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete unit" }).click()
    await expect(deletes).toHaveCount(left - 1)
  }
  await deletes.first().click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete unit" }).click()
  await expect(page.getByText("A listing needs at least one unit.")).toBeVisible()
  await expect(deletes).toHaveCount(1)
})

test("suspending a landlord hides their listings until they're reactivated", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/users")
  await page.getByRole("searchbox", { name: "Search users" }).fill("teresita")
  await page.getByRole("button", { name: "Actions for Teresita Santos" }).click()
  await page.getByRole("menuitem", { name: "Suspend account" }).click()
  await expect(page.getByRole("alertdialog").getByText("their listings are hidden from renters")).toBeVisible()
  await page.getByRole("alertdialog").getByRole("button", { name: "Suspend account" }).click()
  await expect(page.getByText("Teresita Santos is now suspended")).toBeVisible()
  await savedAccountStatus(page, "u-landlord-1", "suspended")

  await page.goto("/listing/santos-boarding-house")
  await expect(page.getByRole("heading", { level: 1, name: "This listing isn't available" })).toBeVisible()
  await page.goto("/search?location=dagupan")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("link", { name: "Santos Boarding House" })).toHaveCount(0)

  await page.goto("/admin/listings?review=santos-boarding-house")
  await expect(page.getByText("Hidden from renters because the landlord's account is suspended.")).toBeVisible()

  await page.goto("/admin/users")
  await page.getByRole("searchbox", { name: "Search users" }).fill("teresita")
  await page.getByRole("button", { name: "Actions for Teresita Santos" }).click()
  await page.getByRole("menuitem", { name: "Reactivate account" }).click()
  await expect(page.getByText("Teresita Santos is now active")).toBeVisible()
  await savedAccountStatus(page, "u-landlord-1", "active")

  await page.goto("/listing/santos-boarding-house")
  await expect(page.getByRole("heading", { level: 1, name: "Santos Boarding House" })).toBeVisible()
})

test("changing the rent on a live listing sends it back for review", async ({ page }) => {
  await signInAs(page, "landlord")
  await page.goto("/landlord/properties/santos-boarding-house")
  await page.getByRole("button", { name: /^Edit / }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Changing the rent sends your live listing back for review.")).toBeVisible()
  // Saving without touching the rent leaves it live.
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText("back in review")).toHaveCount(0)

  await page.getByRole("button", { name: /^Edit / }).first().click()
  await dialog.locator('input[inputmode="numeric"]').first().fill("9999")
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Your listing is back in review")).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirm availability" })).toHaveCount(0)
})

test("each page names itself in the browser tab", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/^Abong: /)
  await page.goto("/safety")
  await expect(page).toHaveTitle("Renting safely | Abong")
  await page.goto("/listing/santos-boarding-house")
  await expect(page).toHaveTitle("Santos Boarding House | Abong")
})

test("the home page previews schools and links to the full list", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /^See all \d+ schools$/ }).click()
  await expect(page).toHaveURL(/\/near$/)
  await expect(page.getByRole("heading", { level: 1, name: "Find a place near your school" })).toBeVisible()
})

test("a change survives leaving the page straight away", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/users")
  await page.getByRole("searchbox", { name: "Search users" }).fill("mika")
  await page.getByRole("button", { name: "Actions for Mika Reyes" }).click()
  await page.getByRole("menuitem", { name: "Suspend account" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Suspend account" }).click()
  await expect(page.getByText("Mika Reyes is now suspended")).toBeVisible()
  // No waiting for the debounced save.
  await page.reload()
  await page.getByRole("searchbox", { name: "Search users" }).fill("mika")
  await page.getByRole("button", { name: "Actions for Mika Reyes" }).click()
  await expect(page.getByRole("menuitem", { name: "Reactivate account" })).toBeVisible()
})

test("sign-in never redirects to another site", async ({ page }) => {
  for (const next of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
    await page.goto(`/login?next=${encodeURIComponent(next)}`)
    await page.getByRole("button", { name: /Continue as renter/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith("/login"))
    expect(new URL(page.url()).hostname).toBe("localhost")
    await page.evaluate(() => localStorage.removeItem("abong:session"))
  }
})

test("work pages don't scroll sideways on the narrowest phones", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  for (const [role, path] of [
    ["landlord", "/landlord/dashboard"],
    ["admin", "/admin/listings"],
    ["admin", "/admin/verifications"],
  ] as const) {
    await signInAs(page, role)
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.waitForTimeout(600)
    const overflow = await page.evaluate<number>("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})

test("admin can search and filter landlords", async ({ page }) => {
  await signInAs(page, "admin")
  await page.goto("/admin/landlords")
  await page.getByRole("searchbox", { name: "Search landlords" }).fill("teresita")
  await expect(page.getByRole("link", { name: "Public profile of Teresita Santos" })).toBeVisible()
  await page.getByRole("searchbox", { name: "Search landlords" }).fill("no such landlord")
  await expect(page.getByText("No landlords match")).toBeVisible()
  await page.getByRole("searchbox", { name: "Search landlords" }).fill("")
  await page.getByRole("tab", { name: /With reports/ }).click()
  await expect(page.getByRole("link", { name: /\d+ reports?/ }).first()).toBeVisible()
})

test("landlords can't open admin pages, and the new admin profile is admin-only", async ({ page }) => {
  await signInAs(page, "landlord")
  for (const path of ["/admin", "/admin/users", "/admin/profile"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { name: "This area is for admins" })).toBeVisible()
  }
})

for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [768, 1024], [390, 844], [390, 664]]) {
  test(`the admin profile fits ${width}x${height} without the page scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await signInAs(page, "admin")
    await page.goto("/admin/profile")
    await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible()
    const { scrollHeight, clientHeight } = await page.locator("html").evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
    await expect(page.getByRole("button", { name: "Sign out" })).toBeInViewport({ ratio: 1 })
  })
}

for (const path of ["/login", "/register"]) {
  test(`${path} fits the screen without the page scrolling`, async ({ page }) => {
    await page.goto(path)
    await page.locator("main form").waitFor()
    const { scrollHeight, clientHeight } = await page.locator("html").evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
    await expect(page.getByRole("button", { name: /Sign in|Create my account/ })).toBeInViewport()
  })
}

test("the sign-in and register cards are the same size", async ({ page }) => {
  const cardBox = async (path: string) => {
    await page.goto(path)
    await page.locator("main form").waitFor()
    return page.locator("main > div").boundingBox()
  }
  expect(await cardBox("/register")).toEqual(await cardBox("/login"))
})

test("a new landlord can register, with focus sent to the first problem", async ({ page }) => {
  await page.goto("/register")
  await expect(page.getByRole("main")).toHaveCount(1)

  await page.getByText("List a property").click()
  const submit = page.getByRole("button", { name: "Create landlord account" })
  await submit.click()
  await expect(page.getByLabel("Full name")).toBeFocused()
  await expect(page.getByText("You need to accept the terms to continue.")).toBeVisible()

  await page.getByLabel("Full name").fill("Ana Reyes")
  await page.getByLabel("Email address").fill("ana.reyes@example.com")
  await page.getByLabel("Mobile number").fill("0917 123 4567")
  await page.getByRole("combobox", { name: /Properties in/ }).click()
  await page.getByRole("option").first().click()
  await page.getByLabel(/^Password/).fill("kamusta-123")
  await page.getByRole("checkbox", { name: /I agree/ }).click()
  await submit.click()

  await expect(page).toHaveURL(/\/landlord\/verification/)
})

/** Waits for the header's account nav to show exactly these links, left to right, ignoring badge counts. */
async function expectAccountNav(page: Page, name: string, labels: string[]) {
  const links = page.getByRole("banner").getByRole("navigation", { name }).getByRole("link")
  await expect(links).toHaveText(labels.map((label) => new RegExp(`^${label}`)))
}

test("each role sees its own links before the profile icon, and switching updates them", async ({ page, isMobile }) => {
  test.skip(isMobile, "The account links live in the menu sheet on small screens.")
  await signInAs(page, "renter")

  const header = page.getByRole("banner")
  const avatar = header.getByRole("button", { name: /Demo menu for/ })
  const viewings = header.getByRole("navigation", { name: "Your rentals" }).getByRole("link", { name: /Viewings/ })
  await expectAccountNav(page, "Your rentals", ["Saved", "Inquiries", "Viewings"])
  // Retried because the header is right-aligned: badges loading in shift it between measurements.
  await expect(async () => {
    const avatarBox = (await avatar.boundingBox())!
    const viewingsBox = (await viewings.boundingBox())!
    expect(viewingsBox.x + viewingsBox.width).toBeLessThan(avatarBox.x + 1)
  }).toPass()

  // Landlords land in their dashboard, under the same header renters use.
  await avatar.click()
  await page.getByRole("menuitem", { name: "Switch demo role" }).click()
  await page.getByRole("menuitem", { name: "Landlord" }).click()
  await expect(page).toHaveURL(/\/landlord\/dashboard/)
  await expectAccountNav(page, "Your properties", ["Dashboard", "Properties", "Listings", "Inquiries", "Viewings"])

  await page.goto("/search")
  await expectAccountNav(page, "Your properties", ["Dashboard", "Properties", "Listings", "Inquiries", "Viewings"])
  await expect(header.getByRole("navigation", { name: "Your rentals" })).toHaveCount(0)

  await header.getByRole("button", { name: /Demo menu for/ }).click()
  await page.getByRole("menuitem", { name: "Switch demo role" }).click()
  await page.getByRole("menuitem", { name: "Admin" }).click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto("/search")
  await expectAccountNav(page, "Admin", ["Overview", "Moderation", "Verifications", "Reports", "Users"])
})

test("the header keeps every link on one line at the narrowest desktop width", async ({ page, isMobile }) => {
  test.skip(isMobile, "The desktop bar only shows at 1024px and up.")
  await page.setViewportSize({ width: 1024, height: 700 })
  for (const [role, nav, count] of [["renter", "Your rentals", 3], ["landlord", "Your properties", 5], ["admin", "Admin", 5]] as const) {
    await signInAs(page, role)
    await page.goto("/search")
    const header = page.getByRole("banner")
    const links = header.getByRole("navigation", { name: nav }).getByRole("link")
    await expect(links).toHaveCount(count)
    // Let the badges load, since they add width.
    await page.waitForLoadState("networkidle")
    for (const link of [...(await links.all()), header.getByRole("link", { name: "Find a place" })]) {
      expect((await link.boundingBox())!.height).toBeLessThanOrEqual(36)
    }
    const overflow = await page.evaluate<number>("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    expect(overflow).toBeLessThanOrEqual(0)
    const logo = (await header.getByRole("link", { name: /abong/i }).first().boundingBox())!
    const find = (await header.getByRole("link", { name: "Find a place" }).boundingBox())!
    expect(find.x).toBeGreaterThanOrEqual(logo.x + logo.width)
    await page.evaluate(() => localStorage.clear())
  }
})

test("the avatar menu holds only the two demo actions", async ({ page }) => {
  for (const role of ["renter", "landlord", "admin"] as const) {
    await signInAs(page, role)
    await page.getByRole("button", { name: /Demo menu for/ }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Reset demo data", "Switch demo role"])
    await page.keyboard.press("Escape")
    await page.evaluate(() => localStorage.clear())
  }
})

test("reset demo data reloads and keeps the session", async ({ page }) => {
  await signInAs(page, "renter")
  await page.getByRole("button", { name: /Demo menu for/ }).click()
  await page.getByRole("menuitem", { name: "Reset demo data" }).click()
  await expect(page.getByRole("button", { name: /Demo menu for/ })).toBeVisible()
})

test("renters and landlords sign out from their profile page", async ({ page }) => {
  for (const [role, path] of [["renter", "/profile"], ["landlord", "/landlord/profile"]] as const) {
    await signInAs(page, role)
    await page.goto(path)
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("You're signed out")).toBeVisible()
    await expect(page.getByRole("button", { name: /Demo menu for/ })).toHaveCount(0)
  }
})

test("the name beside the avatar opens the profile page", async ({ page, isMobile }) => {
  test.skip(isMobile, "The name is hidden on small screens; the menu sheet links to the profile instead.")
  await signInAs(page, "renter")
  await page.getByRole("banner").getByRole("link", { name: /Profile for/ }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible()
})

test("renters reach their profile from the mobile menu", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile only.")
  await signInAs(page, "renter")
  await page.getByRole("button", { name: "Open menu" }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("link", { name: /Saved/ })).toBeVisible()
  await expect(sheet.getByRole("link", { name: /Inquiries/ })).toBeVisible()
  await expect(sheet.getByRole("link", { name: /Viewings/ })).toBeVisible()
  await sheet.getByRole("link", { name: "Profile" }).click()
  await expect(page).toHaveURL(/\/profile$/)
})

test("admins reach their profile from the header, and sign out there", async ({ page, isMobile }) => {
  await signInAs(page, "admin")
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("dialog").getByRole("link", { name: "Profile" }).click()
  } else {
    await page.getByRole("banner").getByRole("link", { name: /Profile for/ }).click()
  }
  await expect(page).toHaveURL(/\/admin\/profile$/)
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("button", { name: /Demo menu for/ })).toHaveCount(0)
})

test("roles can't open each other's areas by URL", async ({ page }) => {
  await signInAs(page, "renter")
  await page.goto("/admin/users")
  await expect(page.getByRole("heading", { name: "This area is for admins" })).toBeVisible()
  await page.goto("/landlord/dashboard")
  await expect(page.getByRole("heading", { name: "This area is for landlords" })).toBeVisible()
})

test("unknown routes show the not-found page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist")
  await expect(page.getByRole("heading", { level: 1, name: "This door doesn't lead anywhere" })).toBeVisible()
})

test("listing shows the estimated move-in cost", async ({ page }) => {
  await page.goto("/listing/santos-boarding-house")
  const costs = page.getByRole("region", { name: "Rent and move-in costs" })
  // Lowest open bed is ₱2,500 with 1 month advance and 1 month deposit.
  await expect(costs.getByText("Estimated move-in cost")).toBeVisible()
  await expect(costs.getByText("₱5,000", { exact: true })).toBeVisible()
})

test("renter can compare saved places side by side", async ({ page }) => {
  await signInAs(page, "renter")
  await page.goto("/favorites")
  await page.getByRole("button", { name: "Compare" }).click()
  const table = page.getByRole("table", { name: /Comparison of \d saved places/ })
  await expect(table.getByRole("rowheader", { name: "Move-in estimate" })).toBeVisible()
  // The demo's saved places mix per-person and whole-unit prices, which aren't comparable,
  // so no "Lowest" mark may appear.
  await expect(table.getByRole("rowheader", { name: "Monthly rent" })).toBeVisible()
  await expect(table.getByText("Lowest")).toHaveCount(0)
})
