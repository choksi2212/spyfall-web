/**
 * Builds server/data/wordbank.generated.json — exactly 8 × 3000 words.
 * **Simple, frequent English** (everyday / school / TV / cricket commentary style),
 * not academic or rare — easier for Indian ESL players. Still 3000 per category.
 *
 * Run: node server/scripts/build-wordbank.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../data/wordbank.generated.json");
const CORPORA_API = "https://api.github.com/repos/dariusk/corpora/contents/data";
const CORPORA_RAW = "https://raw.githubusercontent.com/dariusk/corpora/master/data";
const TARGET = 3000;

let rankMap = new Map();
const CORE_POOL_SIZE = 6000;
const RANK_NORMAL = 10_000;
const RANK_SCI_TECH = 5500;
const RANK_COUNTRY_TOKEN = 14_000;

const BLOCK = new Set(
  `sex,porn,nazi,slave,rape,slur,coon,spic,kike,hitler,isis,genocide,terror,bombing,meth,heroin,cocaine`
    .split(",")
);

const SKIP_FILES = new Set(["guns_n_rifles.json", "guns.json"]);

const JARGON_RE =
  /(zyg|ptych|xyl|phth|zz|qq|vv|rhin|steth|methyl|ethyl|polymer|isotope|enzyme|mitochond|chloro|fluoro|substrate|receptor|quantum|qubit|regex|lambda|sigma|theta|omega|gnu|api\b|sql|html|http|json|xml)/i;

const buckets = {
  sports: new Set(),
  countries: new Set(),
  objects: new Set(),
  places: new Set(),
  animals: new Set(),
  transport: new Set(),
  technology: new Set(),
  science: new Set(),
};

const geoAllow = new Set();
let coreWords = [];

const COUNTRY_PREFIX = [
  "North",
  "South",
  "East",
  "West",
  "New",
  "Old",
  "Lake",
  "Fort",
  "Port",
  "Mount",
  "Cape",
  "Green",
  "Red",
  "White",
  "Black",
  "Gold",
  "Silver",
  "Little",
  "Great",
  "Upper",
  "Lower",
  "Royal",
  "Grand",
];

function titleCase(s) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function okShape(s) {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (!/^[A-Za-z][A-Za-z '\-]*[A-Za-z']?$/.test(t)) return false;
  if (/\d/.test(t)) return false;
  const low = t.toLowerCase();
  for (const b of BLOCK) if (low.includes(b)) return false;
  if (JARGON_RE.test(t)) return false;
  return true;
}

function rankOf(token) {
  return rankMap.get(token.toLowerCase()) ?? 999_999;
}

function simpleEnough(bucket, display) {
  const parts = display
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zA-Z']/g, "").toLowerCase())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return false;
  if (display.length > 38) return false;

  const phraseLow = display.trim().toLowerCase();

  for (const p of parts) {
    const r = rankOf(p);

    if (bucket === "science" || bucket === "technology") {
      if (r < RANK_SCI_TECH) continue;
      return false;
    }

    if (bucket === "countries") {
      if (r < RANK_COUNTRY_TOKEN) continue;
      if (geoAllow.has(p) || geoAllow.has(phraseLow)) continue;
      return false;
    }

    if (r < RANK_NORMAL) continue;
    return false;
  }
  return true;
}

function add(bucket, raw) {
  if (!okShape(raw)) return;
  const w = titleCase(raw.replace(/\s+/g, " "));
  if (!simpleEnough(bucket, w)) return;
  buckets[bucket].add(w);
}

function walk(obj, fn) {
  if (typeof obj === "string") fn(obj);
  else if (Array.isArray(obj)) obj.forEach((x) => walk(x, fn));
  else if (obj && typeof obj === "object") Object.values(obj).forEach((x) => walk(x, fn));
}

async function ghListDir(sub) {
  const r = await fetch(`${CORPORA_API}/${sub}?ref=master`, {
    headers: { "User-Agent": "spyfall-wordbank-builder" },
  });
  if (!r.ok) throw new Error(`github list ${sub}: ${r.status}`);
  return r.json();
}

async function loadCorporaDir(sub, bucket) {
  const list = await ghListDir(sub);
  for (const item of list) {
    if (item.type !== "file" || !item.name.endsWith(".json")) continue;
    if (SKIP_FILES.has(item.name)) continue;
    const url = `${CORPORA_RAW}/${sub}/${item.name}`;
    const jr = await fetch(url);
    if (!jr.ok) continue;
    try {
      const j = await jr.json();
      walk(j, (s) => add(bucket, s));
    } catch {
      /* ignore */
    }
  }
  console.log(`  ${sub} -> ${bucket}: ${buckets[bucket].size}`);
}

function registerGeo(s) {
  const t = s.trim();
  if (!t) return;
  geoAllow.add(t.toLowerCase());
  t.toLowerCase()
    .split(/\s+/)
    .forEach((part) => {
      const clean = part.replace(/[^a-z]/g, "");
      if (clean) geoAllow.add(clean);
    });
}

async function restCountries() {
  const r = await fetch("https://restcountries.com/v3.1/all?fields=name,capital,region,subregion");
  if (!r.ok) return;
  const data = await r.json();
  for (const c of data) {
    if (c.name?.common) {
      registerGeo(c.name.common);
      add("countries", c.name.common);
    }
    if (Array.isArray(c.capital)) {
      for (const cap of c.capital) {
        registerGeo(cap);
        add("countries", cap);
      }
    }
    if (c.region) {
      registerGeo(c.region);
      add("countries", c.region);
    }
  }
  console.log(`  restcountries -> countries: ${buckets.countries.size}`);
}

async function loadFrequency() {
  const r = await fetch(
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt"
  );
  if (!r.ok) throw new Error("en_50k fetch failed");
  const text = await r.text();
  const words = text
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/)[0])
    .filter(Boolean);
  rankMap = new Map();
  words.forEach((w, i) => {
    const k = w.toLowerCase();
    if (!rankMap.has(k)) rankMap.set(k, i);
  });
  coreWords = words
    .slice(0, CORE_POOL_SIZE)
    .filter((w) => /^[a-z]+$/i.test(w) && w.length >= 3 && w.length <= 11);
  console.log(`  frequency ranks: ${rankMap.size}, core pool: ${coreWords.length}`);
}

/** One common lemma → category (only ranks < RANK_NORMAL). */
function classifyFromFreq(raw) {
  const lw = raw.toLowerCase();
  const r = rankOf(lw);
  if (r >= RANK_NORMAL || lw.length < 3 || lw.length > 12) return null;

  if (/tion$|sion$/.test(lw)) return r < RANK_SCI_TECH ? "science" : null;

  if (
    /phone|computer|camera|screen|video|radio|clock|machine|motor|engine|wire|tool|keyboard|laptop|tablet|internet|email|battery|electric|digital/.test(
      lw
    )
  )
    return r < RANK_SCI_TECH ? "technology" : null;

  if (/train|plane|ship|boat|bus|car|truck|bike|wheel|road|sail|driver|ferry|metro|rail/.test(lw)) return "transport";

  if (/ball|game|sport|team|race|run|jump|swim|golf|tennis|soccer|cricket|hockey|boxing|stadium|player|coach|olympic/.test(lw))
    return "sports";

  if (/dog|cat|bird|fish|horse|cow|pig|duck|lion|tiger|bear|wolf|fox|deer|goat|sheep|mouse|rat|frog|snake|bee|ant|egg|animal|monkey|rabbit|camel|zebra|panda|eagle|shark|whale|crab|turtle|chicken|goose|crow|owl|bat|bee|worm|spider/.test(lw))
    return "animals";

  if (/city|town|village|park|school|hospital|church|temple|station|market|shop|store|house|room|garden|street|bridge|beach|island|forest|desert|lake|river|mountain|field|farm|office|factory|prison|library|museum|cinema|theater|hotel|restaurant|kitchen|bathroom|toilet|gate|tower|square|zoo|airport|harbor|tunnel|station/.test(lw))
    return "places";

  if (/water|fire|rain|snow|wind|sun|moon|star|cloud|tree|flower|grass|plant|seed|leaf|fruit|stone|sand|ice|earth|blood|bone|heart|brain|sick|doctor|nurse|medicine|science|heat|cold|light|dark|sky|season|winter|summer|spring|space|rock|metal|gas|air|smoke|storm|flood|earthquake|volcano|ocean|ice|salt|sugar|acid|atom|cell|virus|energy|gravity|magnet|weather|climate|north|south|pole|equator/.test(lw))
    return "science";

  if (/table|chair|door|window|bed|cup|plate|bowl|spoon|fork|knife|box|bag|book|pen|paper|coat|hat|shoe|shirt|dress|soap|towel|brush|key|lock|ring|watch|bottle|glass|mirror|lamp|blanket|pillow|sheet|carpet|curtain|shelf|drawer|bucket|basket|rope|string|tape|glue|paint|toy|doll|balloon|umbrella|candle|soap|comb|wallet|belt|sock|glove|mask|helmet|flag|map|photo|gift|card|coin|note|drum|guitar|piano|bell|pipe|wheel|chain|hammer|nail|screw|brush|pan|pot|oven|fridge|sink|tap|pipe|fence|gate|roof|wall|floor|ceiling|stairs|lift|gate/.test(lw))
    return "objects";

  if (r < 6500) return "objects";

  return null;
}

function sweepFrequencyFill() {
  const words = [...rankMap.keys()].sort((a, b) => rankOf(a) - rankOf(b));
  for (const w of words) {
    if (rankOf(w) >= RANK_NORMAL) continue;
    const c = classifyFromFreq(w);
    if (!c) continue;
    if (buckets[c].size < TARGET) add(c, w);
  }
}

function topUpCategory(cat) {
  const n = coreWords.length;
  if (n < 80) return;

  let a = 0;
  let b = 1;
  let c = 0;

  while (buckets[cat].size < TARGET) {
    if (cat === "countries") {
      const phrase = `${COUNTRY_PREFIX[a % COUNTRY_PREFIX.length]} ${titleCase(coreWords[b % n])}`;
      a += 1;
      b += 11;
      if (okShape(phrase) && simpleEnough("countries", phrase)) buckets[cat].add(titleCase(phrase));
    } else {
      const w1 = coreWords[a % n];
      const w2 = coreWords[b % n];
      a += 1;
      b += 13;
      if (w1 === w2) continue;
      const phrase = `${titleCase(w1)} ${titleCase(w2)}`;
      if (okShape(phrase) && simpleEnough(cat, phrase)) buckets[cat].add(titleCase(phrase));
    }

    c += 1;
    if (c > n * 400) break;
  }
}

async function main() {
  await loadFrequency();

  console.log("Fetching corpora (entries filtered by simple-English rules)…");
  await loadCorporaDir("sports", "sports");
  await loadCorporaDir("animals", "animals");
  await loadCorporaDir("plants", "animals");
  await loadCorporaDir("transportation", "transport");
  await loadCorporaDir("science", "science");
  await loadCorporaDir("technology", "technology");
  await loadCorporaDir("geography", "countries");
  await loadCorporaDir("architecture", "places");
  await loadCorporaDir("medicine", "places");
  await loadCorporaDir("foods", "objects");
  await loadCorporaDir("colors", "objects");
  await loadCorporaDir("art", "objects");

  await restCountries();

  console.log("  sweeping frequent lemmas into categories…");
  sweepFrequencyFill();

  for (const cat of Object.keys(buckets)) {
    const before = buckets[cat].size;
    if (before < TARGET) console.log(`  top-up ${cat} (${before} → ${TARGET})`);
    topUpCategory(cat);
  }

  const out = {};
  for (const [k, set] of Object.entries(buckets)) {
    out[k] = [...set].slice(0, TARGET);
    if (out[k].length < TARGET) {
      console.error(`Category ${k} only has ${out[k].length} words — increase CORE_POOL_SIZE or relax RANK_*`);
      process.exit(1);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0), "utf-8");
  const bytes = fs.statSync(OUT).size;
  console.log(`Wrote ${OUT} (${bytes} bytes, ${TARGET * 8} words)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
