# SPYFALL — Complete Android App Development Prompt

---

## PROJECT OVERVIEW

Build a **lightweight, offline-only, single-device multiplayer party game** Android app called **"SPYFALL"**.

**Game concept:** All players share one phone. A secret word is shown to every player except the spy(s). Players then take turns saying a one-word clue that references the secret word during a timed discussion round. The spy tries to blend in without knowing the word. After discussion, players physically discuss and figure out the spy. The phone is only used for: setup, card reveals, and the countdown timer. All voting, discussion, and accusations happen in real life — no digital voting screen. Think of it as a real-life Among Us.

---

## HARD TECHNICAL CONSTRAINTS (NON-NEGOTIABLE)

- **Language:** Kotlin
- **UI Framework:** Jetpack Compose (NO XML layouts, NO Fragments)
- **Minimum SDK:** API 26 (Android 8.0)
- **Target SDK:** API 34+
- **Architecture:** Single-Activity, multi-screen using Compose Navigation with a sealed class for routes
- **State Management:** ViewModels + `mutableStateOf` / `StateFlow`. One central `GameViewModel` holds all game state.
- **NO internet permission.** Fully offline. Zero network calls. No analytics, no ads, no remote config.
- **NO third-party UI libraries.** Only Material 3 (Material You) components and built-in Compose animation APIs.
- **NO external fonts loaded at runtime.** You may bundle ONE single font file (max 150KB) for the title/logo treatment only. All other text uses the system default sans-serif.
- **NO bitmap images, PNGs, JPGs, SVGs, or drawable resources for UI.** All icons use Material Icons Extended (bundled with Material 3). All decorative shapes, gradients, glows, and visual effects are drawn programmatically via Compose `Canvas`, `drawBehind`, `Brush.linearGradient`, `Brush.radialGradient`, custom `Shape` classes, `Modifier.shadow`, `Modifier.blur`, etc.
- **NO Lottie, Rive, or any animation library.** All animations use Compose built-ins only: `animateFloatAsState`, `animateDpAsState`, `animateColorAsState`, `AnimatedVisibility`, `AnimatedContent`, `animateContentSize`, `Animatable`, `updateTransition`, `infiniteTransition`, `rememberInfiniteTransition`, `spring()`, `tween()`, `keyframes()`, `repeatable()`, `LaunchedEffect` with `animate()`.
- **NO Room / SQLite database.** Use `SharedPreferences` (or Jetpack DataStore Preferences) ONLY for storing the list of already-used word indices so words never repeat. All other game state is in-memory only and resets when the app is killed. This is intentional.
- **NO dependency injection (no Hilt, no Dagger, no Koin).** Use manual constructor injection or simple singleton objects. This is a single-screen game, not an enterprise app.
- **Single Gradle module.** No multi-module. No build flavor complexity.
- **Target APK size: Under 5MB.** Ideally under 3MB. Achieve this by avoiding unnecessary dependencies, using R8/ProGuard minification, and having zero image assets.
- **Proguard/R8:** Enabled for release builds with `minifyEnabled = true` and `shrinkResources = true`.

---

## WORD BANK SYSTEM (CRITICAL — READ CAREFULLY)

### The No-Repeat Rule

**Words must NEVER repeat.** Even if the user plays this game daily for 10+ years, they must not see the same word twice within the same category. This is a core feature promise.

### Implementation

- Maintain a massive hardcoded word bank as a Kotlin `object` with `Map<Category, List<String>>`.
- **Minimum 3,000 words per category.** 8 categories × 3,000 = 24,000+ words minimum in the codebase.
- Store used word indices in `SharedPreferences` as a JSON string (or comma-separated set of integers) keyed per category. Example key: `"used_words_animals"` → value: `"0,14,203,417,..."`.
- When selecting a word for a round: filter out all used indices for that category, pick a random word from the remaining pool, immediately save the new index to SharedPreferences.
- If a category is fully exhausted (all 3,000 words used — this would take ~8 years of daily play in one category), show a toast/snackbar: "All words in this category have been used! Resetting..." and clear the used list for that category.
- **Word quality matters.** Words should be common enough that all players would recognize them, but specific enough to generate interesting clues. NO obscure/archaic words, NO proper nouns (except in Countries category), NO offensive/inappropriate words. Aim for words a 12-year-old would understand.

### The 8 Categories and Word Guidance

1. **Sports** — Sport names, equipment, moves, positions, events. Examples: Basketball, Goalkeeper, Javelin, Dribble, Olympics, Surfboard, Penalty, Marathon, Shuttlecock, Referee. Include both popular and niche sports terminology.

2. **Countries** — Real country names only. Include all 195 UN-recognized countries plus well-known territories/regions. For the remaining count to reach 3,000, add major cities, states/provinces, and famous geographical landmarks grouped under this category. Label the category "Places & Countries" internally if needed, but display as "Countries" to the user. Examples: Japan, Brazil, Switzerland, Istanbul, Sahara, Antarctica, Silicon Valley, Amazon Rainforest.

3. **Objects** — Everyday physical objects. Examples: Umbrella, Stapler, Chandelier, Skateboard, Microscope, Zipper, Trampoline, Binoculars, Pillowcase, Toaster. Think: things you can hold, see, or interact with physically.

4. **Places** — Types of places/locations (NOT specific named places — that's Countries). Examples: Hospital, Library, Graveyard, Amusement Park, Subway Station, Rooftop, Lighthouse, Casino, Dungeon, Courtroom, Parking Garage, Treehouse.

5. **Animals** — All types: mammals, birds, fish, insects, reptiles, amphibians, extinct animals, mythical creatures (label clearly). Examples: Penguin, Chameleon, Jellyfish, Woodpecker, Scorpion, Platypus, Narwhal, Komodo Dragon, Firefly, Pangolin.

6. **Transport** — Vehicles, modes of transport, transport-related objects and concepts. Examples: Helicopter, Kayak, Segway, Rickshaw, Submarine, Gondola, Bulldozer, Parachute, Hovercraft, Cable Car, Skateboard, Jet Ski.

7. **Technology** — Devices, software concepts, tech terms that a general audience would recognize. Examples: Bluetooth, Smartphone, Drone, Algorithm, Hologram, Wi-Fi, Robot, Satellite, Cryptocurrency, Virtual Reality, Firewall, Smartwatch. NO deep technical jargon that average players wouldn't know.

8. **Science** — Scientific concepts, instruments, phenomena, elements, body parts, natural phenomena. Examples: Volcano, Gravity, Telescope, DNA, Eclipse, Fossil, Bacteria, Magnet, Earthquake, Photosynthesis, Tornado, Mercury. Keep it accessible — think "science you learned in school" not "PhD thesis topics."

### Word Bank File Structure

Create a separate Kotlin file: `WordBank.kt`. Structure:

```kotlin
object WordBank {
    val sports: List<String> = listOf(
        "Basketball", "Cricket", "Goalkeeper", // ... 3000 entries
    )
    val countries: List<String> = listOf(
        "Japan", "Brazil", "Egypt", // ... 3000 entries
    )
    // ... repeat for all 8 categories

    fun getWords(category: Category): List<String> = when (category) {
        Category.SPORTS -> sports
        Category.COUNTRIES -> countries
        Category.OBJECTS -> objects
        Category.PLACES -> places
        Category.ANIMALS -> animals
        Category.TRANSPORT -> transport
        Category.TECHNOLOGY -> technology
        Category.SCIENCE -> science
    }
}
```

**IMPORTANT:** Do NOT generate placeholder lists with 10 words and a comment saying "add more." Generate the full 3,000 per category. If the AI tool cannot generate all at once, generate in batches per category and concatenate. This is the backbone of the game. A small word bank makes the game stale fast and breaks the no-repeat promise.

---

## APP FLOW — 3 SCREENS (STRICTLY LINEAR, MINIMAL)

The app has only 3 screens. No voting screen, no results screen, no ready/pass-the-phone screen. The phone is a tool for setup, card reveals, and the timer — nothing else. All gameplay (discussion, accusations, voting) happens physically in real life.

**Flow: Setup → Card Reveal (loops through all players) → Timer → back to Setup**

---

### SCREEN 1: SETUP (Home Screen / Main Screen)

This is the screen the user sees when they open the app. It is the ONLY screen with configuration options. It contains **4 clearly defined sections** stacked vertically in a scrollable column, with a **START GAME button pinned at the bottom**.

#### Section 1: Players

- **Header:** "PLAYERS" with a player count badge showing current count (e.g., "4/30").
- **Add Player Input:** A text field with a placeholder "Enter player name..." and an "Add" button (or a "+" icon button) to the right. Pressing Enter on the keyboard also adds the player.
- **Validation:**
  - Empty names: Silently ignored (Add button stays disabled/dimmed when input is empty).
  - Duplicate names (case-insensitive): Show a brief inline error text below the input: "This name is already added" in a muted red/error color. Do NOT use a dialog or toast for this — keep it inline and non-disruptive.
  - Maximum name length: 20 characters. Input field stops accepting characters after 20.
  - Maximum 30 players. When 30 is reached, the input field becomes disabled with placeholder text changing to "Maximum players reached".
  - Minimum 3 players required to start the game (enforced on the Start button, not here).
- **Player List:** Below the input, show all added players as styled name cards/chips in a vertically scrollable list (or LazyColumn). Each card shows:
  - A number (index: 1, 2, 3...) on the left.
  - The player's name in the center.
  - A delete/remove icon (X or trash icon) on the right. Tapping it removes the player with a smooth exit animation (shrink + fade out, then the list items below animate upward to fill the gap using `animateItemPlacement` on LazyColumn).
- **Quick Add Feature:** Below the manual input, show a small text button: "Quick Add (Numbered)" — tapping this opens a small dialog or inline stepper where the user can choose a number (3-30), and it auto-generates players named "Player 1", "Player 2", ... "Player N". This is for people who don't care about names and just want to start fast. If players already exist, it clears them and replaces.

#### Section 2: Number of Spies

- **Header:** "SPIES" with the current count displayed prominently.
- **Control:** A horizontal number stepper — a row with a "−" button, the current number in the center, and a "+" button.
- **Range:** Minimum 1, maximum 12. BUT also dynamically capped so that spies < total players. If there are 5 players, max spies = 4. The ONLY hard rule: number of spies MUST be strictly less than number of players. If the user reduces players below the current spy count, auto-reduce spy count to (players - 1).
- **Visual:** The spy count number should be displayed large and bold. The "−" and "+" buttons should be circular with a glassmorphism style. When the count changes, the number should animate (scale pop + color pulse).

#### Section 3: Timer Duration

- **Header:** "TIMER" with the selected duration shown.
- **Control:** Either a set of preset chips OR a slider. **Recommended approach: preset chips + custom option.**
  - Preset chips in a horizontal row: "30s", "1 min", "1:30", "2 min", "3 min", "5 min".
  - One additional chip: "Custom" — tapping this reveals a numeric input or a small time picker (minutes : seconds) constrained between 10 seconds and 10 minutes.
  - Default selection: "2 min".
- **Visual:** Selected chip is highlighted with a glow/accent color fill. Unselected chips are outlined/ghost style.

#### Section 4: Word Category

- **Header:** "CATEGORY" with the selected category name shown.
- **Control:** A grid of category cards (2 columns, 4 rows) or a horizontally scrollable row of larger category chips/cards. Each card shows:
  - A relevant Material Icon for the category (e.g., Sports = sports_soccer, Countries = public/globe, Objects = inventory_2, Places = location_city, Animals = pets, Transport = directions_car, Technology = devices, Science = science).
  - The category name below the icon.
- **Selection:** Single-select. Tapping a card selects it (highlighted border + background fill + scale-up animation). Previously selected card de-selects smoothly.
- **"Random" option:** Include a 9th card labeled "Random" with a shuffle/casino icon. When selected, the game picks a random category each round. This is NOT shown to players — it just internally randomizes.
- **Default selection:** "Random".

#### Start Game Button

- Pinned to the bottom of the screen (NOT scrolling with content — it should float/stick at the bottom with a subtle top-edge fade/gradient so content scrolls behind it cleanly).
- Large, wide, prominent button with the text: "START GAME".
- **Disabled state:** When fewer than 3 players are added. Button appears dimmed/grayed out. Tapping it in disabled state briefly shows a small tooltip or snackbar: "Add at least 3 players to start".
- **Enabled state:** Vibrant accent-colored gradient background, slight pulsing glow animation to draw attention.
- **On press:** Satisfying scale-down then scale-up animation (like a button press). Short haptic vibration if device supports it (`HapticFeedbackType.LongPress`). Then navigate **directly to the Card Reveal Screen for Player 1**. There is NO intermediate "ready" or "pass the phone" screen.

#### Setup Screen — UI/Visual Design Direction

- **Background:** Deep dark (#07070D) with a subtle, large, soft radial gradient in the center — very dark teal-charcoal (#0D1F1F at ~12% opacity). This gives depth without being distracting. **NO purple anywhere.**
- **Section cards:** Each of the 4 sections should be visually grouped inside a rounded container (20dp corner radius) with:
  - Background: White at 5-7% opacity (glassmorphism).
  - Border: 1px solid white at 8-10% opacity.
  - Internal padding: 20dp.
  - Spacing between sections: 16dp.
- **Section headers:** All-caps, tracking/letter-spacing of 2-3sp, font size 13-14sp, color: white at 50-60% opacity. Gives a clean, premium labeling feel.
- **Micro-interactions on this screen:**
  - Adding a player: New card slides in from the right with a fade-in (200ms, easeOut).
  - Removing a player: Card shrinks horizontally to 0 width with fade-out, remaining cards animate to fill gap.
  - Changing spy count: Number does a quick scale-up to 120% then back to 100% (spring animation).
  - Selecting a category: Selected card scales to 105% with border color transitioning to accent, glow appears behind it.

---

### SCREEN 2: CARD REVEAL SCREEN

**Purpose:** Shows each player their card one by one — either the secret word or the "You are the SPY!" message. Players pass the phone to each other physically. There is NO separate "ready" or "pass the phone" screen.

**CRITICAL MECHANIC:** The card starts face-down. The player taps it to reveal. They tap it again to flip it back. Once flipped back, the screen automatically transitions to the NEXT player's card (face-down). This loop continues until all players have seen their card, then the app transitions to the Timer Screen.

**Layout & Interaction — Step by step:**

1. **Player indicator (top of screen):** A clear label showing whose turn it is: the player's name in medium-bold text (e.g., "AKSHAT'S TURN") and a progress indicator showing "Player 3 of 8" — either a horizontal progress bar, step dots, or a fraction. This helps everyone know how far along the reveal process is and who should be looking at the phone.

2. **Initial state (face-down):** A large card shape is displayed in the center of the screen, face-down. The back of the card shows a decorative pattern (drawn with Compose Canvas — a grid of small dots, diagonal lines, or a subtle geometric pattern in accent color at 10-15% opacity). The card has a visible "TAP TO REVEAL" label on it.

3. **Reveal interaction:** The player taps the card. The card performs a **3D flip animation** (rotate around the Y-axis from 0° to 180°, ~400-500ms, easeInOutCubic). The "back" fades out at 90° and the "front" fades in.

4. **Revealed state — NORMAL PLAYER:** The card front shows:
   - The secret word in large, bold text (28-36sp), centered vertically and horizontally on the card.
   - **Nothing else on the card front.** No category label, no "YOUR WORD" header, no subtext. Just the word. Clean, bold, unmistakable.
   - The card background has a subtle gradient (dark teal to dark charcoal, very understated).

5. **Revealed state — SPY:** The card front shows:
   - A large spy icon (Material icon: `visibility_off` or a custom Canvas-drawn eye-with-slash, or a simple detective hat silhouette drawn with Canvas paths).
   - Large text: "YOU ARE THE SPY!" in a distinct color — use a warm red/amber accent (#E85D3A) instead of the usual accent. This immediately differentiates it visually.
   - Below: Smaller text: "You don't know the word. Blend in!" in muted white.
   - Subtle animated background effect on the spy card: a slow-rotating radial gradient or a pulsing red glow — something that makes the spy card feel dangerous/exciting.

6. **Dismissing the card (NO separate button):** The player taps the card itself again to flip it back to face-down (reverse of the reveal animation — 180° back to 0°, same duration and easing). There is NO "Got It" button, NO "Hide Card" button, NO button of any kind below or around the card. The card itself is the only interactive element. Tap to reveal, tap to hide.

7. **After the card flips back to face-down:**
   - If there are MORE players remaining: After a brief pause (300ms), the screen transitions to the next player's card. The player indicator at the top updates to the next player's name. The card is face-down and ready for the next player to tap. Use a smooth crossfade or slide transition for the player name change.
   - If this was the LAST player: After the card flips back, a brief overlay appears — "ALL PLAYERS READY!" text animates in (fade + scale), stays for 1.5 seconds, then the app automatically navigates to the Timer Screen.

**Visual Design for the Card:**
- Card dimensions: ~280dp wide × 400dp tall (adjust for screen responsiveness, but this is the ratio).
- Card corner radius: 24dp.
- Card shadow: Elevated with a colored shadow (accent color at low opacity, ~8dp elevation, blurred).
- Card border: 1px accent-colored border at ~20% opacity.
- The card should feel like a physical game card — premium, tangible, with that satisfying flip.

---

### SCREEN 3: TIMER SCREEN

**Purpose:** A pure countdown timer. Nothing else. No game info, no player list, no buttons cluttering the screen. The phone sits in the middle of the group and counts down. When it hits zero, it declares SPY WINS — because if the group hasn't caught the spy by then, the spy survived.

**Layout:**

- **The ONLY element on screen: A large, dominant circular countdown timer centered both vertically and horizontally.**
  - The timer is displayed as a circle with a shrinking arc/ring that depletes clockwise as time passes (like a donut chart going from full to empty).
  - Inside the circle: the remaining time in MM:SS format, large and bold (56-72sp). This is the biggest text element in the entire app.
  - The ring/arc specifications:
    - Ring thickness: 10-14dp (a clean, modern weight — not too thin, not chunky).
    - Ring track (background): White at 6-8% opacity (the "empty" part of the ring).
    - Ring fill (active): Animates color based on remaining time:
      - Above 50% time remaining: Accent teal/cyan (#00BFA5).
      - 25%-50%: Amber/warm yellow (#E8A317).
      - Below 25%: Red (#FF4D4D), and the timer text starts a subtle pulsing animation (scale oscillates between 100%-106% on a 600ms loop).
      - Below 10 seconds: The ring pulses (opacity oscillates), the timer text pulses faster (400ms loop), and a short haptic tick fires every second.

- **NO other UI elements on this screen.** No player count, no category name, no spy count, no pause button, no skip button. Just the timer in the center of a dark void. The minimalism IS the design.

- **When the timer reaches 0:00:**
  - The timer ring disappears.
  - A dramatic **"SPY WINS!"** text animates in — zooms from 300% scale down to 100% with a spring bounce, in the danger/red color (#E85D3A), with a large glowing bloom effect behind it.
  - Device vibration: A strong 500ms haptic burst.
  - The "SPY WINS!" text stays on screen for 3 seconds.
  - After 3 seconds, the text fades, and two buttons fade in side by side:
    - **"PLAY AGAIN"** — Returns to the Setup Screen with ALL previous settings preserved (same players, same spy count, same timer, same category). Only the word changes (new random word from the pool, guaranteed not to repeat). The spy roles are also re-randomized. This is crucial for fast consecutive rounds.
    - **"NEW GAME"** — Returns to the Setup Screen with everything reset to defaults (empty player list, 1 spy, 2 min timer, Random category).
  - Both buttons use the standard glassmorphism card style.

**Visual:**
- Same dark background as all other screens.
- The timer circle is the ONLY visual focus. It should feel meditative, tense, and cinematic — like a bomb timer in a movie.
- The timer circle should have a very subtle outer glow in the current ring color (accent at 10% opacity, 12dp blur radius). This glow color transitions along with the ring color.

---

## GLOBAL VISUAL DESIGN SYSTEM

### CRITICAL: NO PURPLE. NO AI-GENERIC COLORS.

The color palette must feel **distinctive, deliberate, and NOT like every other AI-generated dark mode app.** Specifically:
- **NO purple** (#A855F7, #7C3AED, #6366F1, or any hue in the 260°-300° range). Zero purple anywhere in the app — not in gradients, not in glows, not in accents, not in backgrounds. Purple is the default "AI slop" color and makes every app look generic.
- **NO indigo-to-purple gradients.** This is the #1 most overused AI design pattern.
- **NO neon rainbow multi-color accents.**

### Color Palette (Dark Theme Only — No Light Theme)

The palette is built around a **teal-cyan primary accent** paired with **warm amber/red danger tones**. This gives a cold-vs-hot contrast that fits the spy theme: icy calm for normal gameplay, heated red when danger/spy is involved.

| Token | Hex | Usage |
|---|---|---|
| `background` | `#07070D` | App background — near-black with a cool undertone |
| `backgroundSubtle` | `#0D1A1A` | Subtle radial gradient center (teal-black, used at 10-15% opacity over background) |
| `surface` | `#FFFFFF` at 6% opacity | Card/chip backgrounds (glassmorphism) |
| `surfaceBorder` | `#FFFFFF` at 10% opacity | Card/chip borders |
| `surfaceHover` | `#FFFFFF` at 10% opacity | Pressed/hovered card state |
| `textPrimary` | `#E8E8ED` | Main text — slightly off-white, easier on the eyes than pure white |
| `textSecondary` | `#E8E8ED` at 55% opacity | Labels, headers, hints |
| `textTertiary` | `#E8E8ED` at 30% opacity | Disabled text, placeholders |
| `accentPrimary` | `#00BFA5` | Primary accent — a deep teal-cyan. Used for: selected states, active chips, the Start button, timer ring (normal state), active input borders |
| `accentLight` | `#4DD9C0` | Lighter tint of accent — used for text on accent backgrounds where #00BFA5 is too dark |
| `accentGlow` | `#00BFA5` at 20% opacity | Glow/bloom effects behind accent elements |
| `accentGradientStart` | `#00BFA5` | Gradient start (teal) |
| `accentGradientEnd` | `#00897B` | Gradient end (deeper teal) — NOT purple. Teal-to-deeper-teal. |
| `danger` | `#E85D3A` | Spy card, SPY WINS text, spy-related elements — a warm burnt orange-red, not a generic bright red |
| `dangerGlow` | `#E85D3A` at 20% opacity | Glow behind spy/danger elements |
| `dangerBright` | `#FF4D4D` | Timer critical state (below 25%), high-urgency pulsing |
| `warning` | `#E8A317` | Timer mid-range (25-50%) — warm amber, not generic yellow |
| `timerNormal` | `#00BFA5` | Timer ring when above 50% — matches accent |

### Typography System

**DO NOT use the default Roboto for everything.** The app must feel like a game, not a settings menu.

- **Bundle ONE font file** (max 150KB) for display/heading use: **Use a geometric sans-serif with character.** Recommended: `Inter` (tight, modern, excellent number rendering), `Outfit` (geometric, slightly rounded, friendly-yet-sharp), or `Space Grotesk` (techy, distinctive, great for a spy game). Pick ONE. Use it for all headings, large numbers, the logo, and button text.
- **Body/secondary text:** System default sans-serif (Roboto on most Android devices). This keeps the APK lean while still having a distinctive heading font.

| Usage | Font | Size | Weight | Color | Extras |
|---|---|---|---|---|---|
| App title / "SPYFALL" logo | Bundled font | 32-40sp | ExtraBold (800) | `textPrimary` | Letter-spacing: 6sp, all-caps |
| Section headers ("PLAYERS", "SPIES", etc.) | Bundled font | 13sp | SemiBold (600) | `textSecondary` | Letter-spacing: 3sp, all-caps |
| Player names in list | System default | 16sp | Regular (400) | `textPrimary` | — |
| Large numbers (spy count, timer digits) | Bundled font | 40-72sp | Bold (700) | `textPrimary` | Tabular/monospace number rendering if the font supports it |
| The secret word on the card | Bundled font | 30-38sp | Bold (700) | `textPrimary` | Centered on card |
| "YOU ARE THE SPY!" | Bundled font | 26-30sp | ExtraBold (800) | `danger` | Letter-spacing: 2sp |
| "SPY WINS!" (timer end) | Bundled font | 44-52sp | ExtraBold (800) | `danger` | Letter-spacing: 3sp |
| Button text ("START GAME", "PLAY AGAIN") | Bundled font | 16sp | SemiBold (600) | `textPrimary` | Letter-spacing: 1.5sp, all-caps |
| Small labels, hints, placeholders | System default | 13-14sp | Regular (400) | `textTertiary` | — |
| Input field text | System default | 16sp | Regular (400) | `textPrimary` | — |

### Animation Principles

- **Duration guidelines:**
  - Micro-interactions (button press, toggle): 100-200ms.
  - Card transitions (flip, slide-in): 300-500ms.
  - Screen transitions: 300-400ms.
  - Looping ambient animations (glow pulse, breathing): 2000-4000ms.
  
- **Easing:** Use `FastOutSlowInEasing` for most transitions. Use `spring(dampingRatio = 0.6f)` for bouncy/playful interactions (number changes, scale pops).

- **Never block interaction with animation.** All animations should be non-blocking — the user can always tap even if an animation is in progress.

- **Haptic feedback:** Use `LocalHapticFeedback.current.performHapticFeedback()` for:
  - Adding/removing a player.
  - Changing spy count (each increment/decrement).
  - Start Game button press.
  - Card flip (both reveal and hide).
  - Timer hitting 0 (strong vibration).
  - Timer last 10 seconds (subtle tick each second).

### Spacing & Layout

- Screen horizontal padding: 20-24dp.
- Card internal padding: 16-20dp.
- Spacing between major sections: 16-20dp.
- Spacing between items within a section: 10-12dp.
- Corner radius for cards/containers: 20dp.
- Corner radius for chips/buttons: 14dp.
- Corner radius for the game card (reveal): 24dp.

### Glassmorphism Recipe (Applied Consistently Everywhere)

Every card, chip, section container, and elevated surface uses this recipe:
```
Background: Color.White.copy(alpha = 0.06f)
Border: 1.dp, Color.White.copy(alpha = 0.10f), shape = RoundedCornerShape(20.dp)
```
Do NOT use `Modifier.blur` on the card itself (it's expensive). The "glass" effect comes from the semi-transparent background over the dark base — no actual blur needed.

---

## SCREEN TRANSITIONS

All navigation transitions should feel smooth and intentional:

- **Setup → Card Reveal (Player 1):** Slide-in from right + fade-in (300ms). The first player's name appears at the top, card appears face-down in center.
- **Card Reveal → Card Reveal (next player):** Crossfade on the player name/indicator (250ms). The card is already face-down (the previous player flipped it back), so only the top label changes.
- **Card Reveal (last player) → Timer:** Slide-up from bottom + fade-in (400ms). The timer screen rises into view dramatically after the "ALL PLAYERS READY!" overlay.
- **Timer (SPY WINS) → Setup:** Fade out SPY WINS + buttons, slide-in Setup from left (300ms).

Use Compose Navigation's `AnimatedNavHost` with custom `EnterTransition` and `ExitTransition` for each route pair.

---

## EDGE CASES & GUARDRAILS

1. **Back button handling:** Pressing the system back button during an active game (Card Reveal or Timer screens) should show a confirmation dialog: "Quit current game? Progress will be lost." with "Cancel" and "Quit" options. Quitting returns to Setup with settings preserved (players, spy count, timer, category all kept).

2. **Screen rotation:** Lock the app to PORTRAIT orientation. Set `android:screenOrientation="portrait"` in the manifest. This is a pass-the-phone party game — rotation would be disruptive.

3. **Screen timeout:** During the Timer Screen, keep the screen on using `FLAG_KEEP_SCREEN_ON` or the Compose equivalent (`KeepScreenOn` side effect). The timer must be visible throughout discussion. Also keep screen on during Card Reveal phase.

4. **All players are spies:** If the user sets spies = players (e.g., 5 players, 5 spies), technically everyone is a spy and no one sees the word. This is a valid (absurd) configuration — let it happen. Every card will say "YOU ARE THE SPY!" and the timer phase becomes a funny meta-game.

5. **Minimum players:** Enforce minimum 3 players. Don't allow starting with fewer.

6. **SharedPreferences corruption:** If reading used-word data from SharedPreferences fails (malformed JSON, etc.), catch the exception, clear that category's used list, and continue normally. Never crash.

7. **Very long player names:** Enforced max 20 chars at input. But also add `maxLines = 1` and `overflow = TextOverflow.Ellipsis` wherever player names are displayed, just in case.

8. **Double-tap prevention on card:** After a tap triggers the flip animation, ignore further taps until the animation completes. Prevent the card from being flipped mid-flip.

9. **"PLAY AGAIN" state preservation:** When returning from Timer to Setup via "PLAY AGAIN," the app must remember all settings AND immediately re-randomize spy assignments and pick a new unused word. When the user hits "START GAME" again, the game should feel fresh despite having the same players.

---

## PROJECT STRUCTURE (SUGGESTED)

```
app/src/main/java/com/spyfall/
├── MainActivity.kt                  // Single activity, sets up ComposeNavHost
├── navigation/
│   └── NavGraph.kt                  // Sealed class routes + AnimatedNavHost
├── ui/
│   ├── theme/
│   │   ├── Color.kt                 // All color tokens defined here
│   │   ├── Theme.kt                 // MaterialTheme wrapper (dark only)
│   │   └── Type.kt                  // Typography scale with bundled font
│   ├── components/
│   │   ├── GlassCard.kt             // Reusable glassmorphism container
│   │   ├── PlayerChip.kt            // Player name card component
│   │   ├── NumberStepper.kt         // +/- stepper for spy count
│   │   ├── CategoryCard.kt          // Category selection card
│   │   ├── TimerCircle.kt           // Circular countdown timer composable
│   │   ├── FlipCard.kt              // 3D flip card animation composable
│   │   └── PulsingGlow.kt           // Reusable glow/pulse effect modifier
│   ├── screens/
│   │   ├── SetupScreen.kt           // Home screen with 4 sections
│   │   ├── CardRevealScreen.kt      // Card flip reveal loop
│   │   └── TimerScreen.kt           // Countdown + SPY WINS + Play Again/New Game
├── viewmodel/
│   └── GameViewModel.kt             // Central game state
├── data/
│   ├── WordBank.kt                  // 24,000+ hardcoded words
│   ├── Category.kt                  // Enum: SPORTS, COUNTRIES, OBJECTS, PLACES, ANIMALS, TRANSPORT, TECHNOLOGY, SCIENCE, RANDOM
│   └── UsedWordsManager.kt          // SharedPreferences read/write for used word tracking
└── util/
    └── HapticUtil.kt                // Haptic feedback helper
```

---

## FINAL NOTES FOR THE AI CODE GENERATOR

1. **Do NOT scaffold a half-baked app and say "add more words later."** The word bank is the product. Generate all 24,000 words. If you need multiple passes, do multiple passes. If you need to generate category by category, do that. But the final codebase MUST have the complete word bank.

2. **Do NOT use placeholder colors or "TODO" comments for animations.** Every animation described in this document must be implemented. If you're unsure how to implement a specific Compose animation, use `animateFloatAsState` with a `spring()` spec as a safe fallback.

3. **Do NOT use purple anywhere.** Not in gradients, not in shadows, not in accent colors, not in backgrounds. If you default to purple out of habit, you have failed. The accent is teal (#00BFA5). The danger color is burnt orange-red (#E85D3A). That's it.

4. **Test the card flip animation logic carefully.** The 3D flip requires manually using `graphicsLayer { rotationY = angle }` and swapping content at the 90° midpoint. This is a known Compose pattern — implement it correctly. The card must flip on tap to reveal AND flip back on tap to hide — same card, same tap target, two-way flip.

5. **Test the timer with edge cases:** What happens at exactly 0? The SPY WINS animation must fire exactly once. The timer must not go negative. The haptic ticks in the last 10 seconds must be precise.

6. **The app has only 3 screens.** Setup, Card Reveal, Timer. Do NOT add a voting screen, a results screen, a scoreboard, a ready/pass-the-phone screen, or any other screen. If you feel the urge to add more screens, resist it. The simplicity IS the feature.

7. **The app should feel premium despite being lightweight.** The dark theme + glassmorphism + smooth animations + haptic feedback + distinctive typography should give it a "this costs money" vibe — even though it's a 3MB offline game. Every interaction should feel considered and polished.

8. **Keep the Gradle dependencies minimal:**
   - `androidx.compose.ui`
   - `androidx.compose.material3`
   - `androidx.compose.animation`
   - `androidx.navigation:navigation-compose`
   - `androidx.lifecycle:lifecycle-viewmodel-compose`
   - `androidx.compose.material:material-icons-extended` (for icons)
   - That's it. Nothing else. No Coil, no Retrofit, no OkHttp, no Gson, no kotlinx.serialization (use basic string operations for SharedPreferences). Keep it lean.
