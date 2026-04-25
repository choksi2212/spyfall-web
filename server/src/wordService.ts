import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { Category } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESOLVED: Exclude<Category, "random">[] = [
  "sports",
  "countries",
  "objects",
  "places",
  "animals",
  "transport",
  "technology",
  "science",
];

export type ResolvedCategory = (typeof RESOLVED)[number];

export class WordService {
  private pools = new Map<ResolvedCategory, string[]>();

  async load(): Promise<void> {
    // Strict mode: ONLY load from ../wordbank/*.json
    // (User-provided wordbank is the single source of truth.)
    await this.loadFromLocalWordbank();
    const total = [...this.pools.values()].reduce((a, b) => a + b.length, 0);
    console.log(`[words] loaded ${total} words from /wordbank`);
  }

  private async loadFromLocalWordbank() {
    this.pools.clear();
    const root = path.resolve(__dirname, "../../wordbank");
    const filenameByCat: Record<ResolvedCategory, string> = {
      sports: "sports.json",
      countries: "countries.json",
      objects: "objects.json",
      places: "places.json",
      // Your repo currently uses animal.json (singular). We accept that.
      animals: "animal.json",
      transport: "transport.json",
      technology: "technology.json",
      science: "science.json",
    };

    for (const c of RESOLVED) {
      const fp = path.join(root, filenameByCat[c]);
      const raw = await readFile(fp, "utf-8");
      const j = JSON.parse(raw) as Record<string, unknown>;
      const arr = j[c];
      if (!Array.isArray(arr)) {
        throw new Error(`[words] invalid ${fp}: expected key "${c}" to be an array`);
      }
      const cleaned = arr
        .map((x) => String(x).trim())
        .filter(Boolean);
      if (cleaned.length === 0) {
        throw new Error(`[words] empty category "${c}" in ${fp}`);
      }
      this.pools.set(c, cleaned);
    }
  }

  pickWord(requested: Category): { word: string; resolvedCategory: ResolvedCategory } {
    const resolved: ResolvedCategory =
      requested === "random"
        ? RESOLVED[Math.floor(Math.random() * RESOLVED.length)]!
        : (requested as ResolvedCategory);

    const pool = this.pools.get(resolved) ?? [];
    if (pool.length === 0) {
      // Should never happen in strict mode because we validate at load().
      throw new Error(`[words] pool empty for ${resolved}`);
    }
    const word = pool[Math.floor(Math.random() * pool.length)]!;
    return { word, resolvedCategory: resolved };
  }
}
