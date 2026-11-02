import { openDB, DBSchema } from "idb";
import type { CycleEntry } from "@/lib/cycleEngine";
import type { JournalEntry } from "@/lib/symptomJournal";

interface HerCareDB extends DBSchema {
  cycles: { key: string; value: CycleEntry; indexes: { "by-date": string } };
  journalEntries: { key: string; value: JournalEntry; indexes: { "by-date": string } };
}

const dbPromise = typeof window !== "undefined"
  ? openDB<HerCareDB>("hercare-db", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cycles")) {
          const store = db.createObjectStore("cycles", { keyPath: "id" });
          store.createIndex("by-date", "date");
        }
        if (!db.objectStoreNames.contains("journalEntries")) {
          const store = db.createObjectStore("journalEntries", { keyPath: "id" });
          store.createIndex("by-date", "date");
        }
      },
    })
  : Promise.resolve(null);

export const storage = {
  async addCycleEntry(entry: Omit<CycleEntry, "id">) {
    const db = await dbPromise;
    if (!db) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return db.put("cycles", { ...entry, id });
  },

  async getCycleEntries(): Promise<CycleEntry[]> {
    const db = await dbPromise;
    if (!db) return [];
    return db.getAllFromIndex("cycles", "by-date");
  },

  async getJournalEntries(): Promise<JournalEntry[]> {
    const db = await dbPromise;
    if (!db) return [];
    return db.getAllFromIndex("journalEntries", "by-date");
  },

  async saveJournalEntry(entry: JournalEntry) {
    const db = await dbPromise;
    if (!db) return;
    return db.put("journalEntries", entry);
  },

  async deleteJournalEntry(id: string) {
    const db = await dbPromise;
    if (!db) return;
    return db.delete("journalEntries", id);
  },
};
