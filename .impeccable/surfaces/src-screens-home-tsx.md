---
version: 1
slug: "src-screens-home-tsx"
primary_target: "src/screens/Home.tsx"
related_targets: ["src/screens/Lobby.tsx","src/App.tsx"]
---

# Surface brief: Dialed app (Home, Lobby, gameplay, reveal, shared screen)

Scope and mode: Experience (the player is inside the game). Web, mobile-first at about 420px, plus a landscape shared screen.
Audience/job: friends in one room joining by code, passing a team device around, arguing over a needle. Constraints: PRODUCT.md. Stack fixed (shadcn base-nova, Tailwind 4, Motion). Nothing from the official game may be copied.
Pinned by the user (beats the dice): tactile and warm, physical board-game feel, chunky plastic controls, soft depth and shadow, rounded type, bouncy springs; the agreed board colour language (orange 4 / yellow 3 / blue 2 wedges, red needle).
Seed key 7f151bfc (direction roll assigned an Art Deco lobby; overridden by the pinned brief, disclosed to the user).
Unresolved: logo mark (none exists; author a simple SVG dial mark), final font pairing (choose and self-host).

## Direction contract

THESIS: The app is the game box on a table: the UI is the pieces (cards, dial, crank, buttons), not a web page about them; it refuses the generic rounded-card SaaS lobby and the cream-paper-plus-serif "warm" default.
OWN-WORLD: Saturated teal lacquered tabletop as the committed ground (30-60% of every screen), cream cardstock for cards and panels with a subtle printed card-back pattern, candy-plastic buttons in orange / sunshine yellow / cobalt with a glossy top highlight, a bottom lip and soft layered shadows (never hard offset blocks), chunky rounded display type with a distinct personality (not Fredoka/Nunito defaults), friendly rounded body face, team colours as plastic game tokens. Sound and haptics already exist; surfaces should feel pressable (squash on press, spring back).
STORY: A guest scans a QR, types a team name and picks a plastic colour in seconds; the host sees a table filling up with tokens; the room code is the hero. In play, one device feels like a physical board turned toward the team.
FIRST VIEWPORT: Home at 420px: teal table ground, a big chunky "Dialed" wordmark over a half-dial emblem with a swinging red needle, two oversized candy buttons ("Host a game", "Join with a code") with a four-box code entry tile row below; the primary action sits in the thumb zone. Lobby: the 4-letter room code as four big cream tiles at the top with QR on a cream card, team tokens seated around a table list, host settings in a collapsible cardstock panel, Start as the biggest orange button.
FORM: Tabletop game-box world (own world, from the pinned brief). Signature interaction: pressable plastic buttons with squash-and-spring plus a needle that wobbles on the logo; one orchestrated moment on room creation (tiles flip in one by one). Motion respects prefers-reduced-motion.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
