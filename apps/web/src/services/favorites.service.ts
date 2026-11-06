import type { Favorite, SavedSearch, SearchFilters } from "@/types"
import { db, nextId } from "./mock/db"
import { respond } from "./mock/latency"

const SAVED_SEARCHES_KEY = "abong:saved-searches"

function readSearches(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) ?? "[]") as SavedSearch[]
  } catch {
    return []
  }
}

function writeSearches(list: SavedSearch[]) {
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(list))
  } catch {
    // Without storage, saved searches simply won't persist past this page load.
  }
}

/** Favorites and saved searches are per-device in the demo; the API will scope them to the signed-in renter. */
export const favoritesService = {
  list(): Promise<Favorite[]> {
    return respond(() => db.favorites, 120)
  },

  toggle(listingId: string): Promise<{ saved: boolean }> {
    return respond(() => {
      const index = db.favorites.findIndex((f) => f.listingId === listingId)
      if (index >= 0) db.favorites.splice(index, 1)
      else db.favorites.unshift({ listingId, savedAt: new Date().toISOString() })
      return { saved: index < 0 }
    }, 80)
  },

  listSearches(): Promise<SavedSearch[]> {
    return respond(readSearches, 100)
  },

  saveSearch(name: string, filters: SearchFilters): Promise<SavedSearch> {
    return respond(() => {
      const search: SavedSearch = { id: nextId("ss"), name, filters, createdAt: new Date().toISOString(), alerts: true }
      writeSearches([search, ...readSearches()].slice(0, 20))
      return search
    }, 200)
  },

  updateSearch(id: string, patch: Partial<Pick<SavedSearch, "alerts" | "name">>): Promise<void> {
    return respond(() => writeSearches(readSearches().map((s) => (s.id === id ? { ...s, ...patch } : s))), 100)
  },

  deleteSearch(id: string): Promise<void> {
    return respond(() => writeSearches(readSearches().filter((s) => s.id !== id)), 100)
  },
}
