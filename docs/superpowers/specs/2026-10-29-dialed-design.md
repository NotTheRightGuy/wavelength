# Dialed — Design Spec

Dialed is a Wavelength-style party game: browser-based, mobile-first, rooms joined by code. (Codename: "Wavelength". Public name: **Dialed**, because "Wavelength" is a trademarked board game.) This document is the design confirmed in the grilling session of 2026-10-29.

## Platform and stack
- React + Vite + TypeScript, Tailwind 4, shadcn for plain UI (lobby, settings, dialogs), Motion (`motion/react`) for animation, Web Audio API for sound, Vitest for unit tests, Playwright for the smoke test. Package manager: pnpm. Installable as a PWA.
- Backend: its own Supabase project (not Poker Night's). Anonymous sign-in, no accounts. Realtime for live updates.
- Hosting: Vercel (static build) with the hosted Supabase project. Local dev runs Supabase in Docker (Supabase CLI).

## Rooms and devices
- The host creates a room and gets a 4-letter code and a QR code. The host is whoever creates the room, can be on the shared screen or a team device, and can hand host controls to another device.
- A shared big screen (board, reveal, scoreboard) is optional but recommended. Team/player devices act as controllers.
- **Team mode:** 2–6 teams, one device per team. Each team types its member names; those drive round-robin psychic rotation ("Pass to Sam"). Host sets team names and colours.
- **Free play:** 3–12 players, one device each.
- Rooms expire after 6 hours idle. Rematch keeps the same room, teams and code and resets scores.

## Turn flow
1. The psychic draws 2 cards (opposite pairs) and picks 1. Built-in deck of about 150 original pairs; host can add custom cards per room.
2. The server picks a random target (uniform, clamped so the whole target fits on the board). The psychic sees it via pass-and-peek on the team device (or from their own phone). Other teams and the shared screen never receive it before the reveal.
3. Cranking: shutter closes, psychic drags a crank in circles, the wheel spins with momentum and ratchet clicks. "Spin for me" fallback button. The crank is ceremony only; the server decides the target.
4. Clue: typed (optional) or spoken.
5. Dial: the team drags the needle; every screen sees it move live (broadcast about 20 Hz, spring-smoothed). In free play guesses stay hidden until everyone has locked in.
6. Team mode: each other team guesses left or right of the needle.
7. Reveal sequence (about 3–4 s, skippable by tap): lock-in clunk → left/right picks lock → drumroll → shutter springs open with overshoot → needle glows in the band colour and points fly to the scoreboard with chimes → left/right bonus points pop in.
8. Timers off by default. Host can enable a dial timer of 60/90/120 s, ticking in the last 10 s; at zero the needle locks where it is.

## Scoring and rules
- Board is 0–100. Target is 20 wide (centre in 10..90), in five 4-wide bands scoring 2/3/4/3/2.
- **Team mode** (official rules): dial points 4/3/2/0 by band. Each other team guesses left/right; a correct guess scores +1. A team that scores 4 and is still behind goes again (catch-up). First to 10 by default (host can change). The game ends after the turn on which any team reaches the winning score and the highest score wins. Tied leaders play sudden-death rounds (each tied team gets one turn per cycle; the best gain wins, repeat while tied). Catch-up turns are applied before the end check.
- **Free play:** everyone is psychic N times (host picks, default 2). Each guesser scores 4/3/2/0 by band. The psychic scores the rounded average of the guessers' points. Highest total wins; ties are shared wins.

## Security
- Postgres is authoritative; every game action goes through `security definer` RPC functions; clients have no direct writes.
- The target sits in a separate table protected by RLS: readable only by the active seat's session during spin/clue/dial, and by room members after the reveal. Casual cheating is blocked; this is not bank-grade.
- Rejoin after refresh works because state is server-side.

## Look, sound, accessibility
- Classic semicircle board with coloured scoring wedges, a red needle, chunky plastic feel with depth and shadows and a visible crank knob; our own drawing, no copied logos or artwork.
- Sounds are generated in code (ratchet clicks follow crank speed, shutter swoosh, dial ticks, drumroll, score chimes).
- Mute and volume remembered per device; haptic ticks where supported; `prefers-reduced-motion` swaps spins and shutter for short fades; every drag interaction has a button alternative.

## Testing
- Unit tests (Vitest, test-first) for the pure game-engine module: scoring, target generation, team turn flow, catch-up, sudden death, free-play scoring and laps, rotation.
- SQL tests (pgTAP) for the RPCs and the RLS rule that hides the target; the plpgsql turn logic is checked against the same fixtures as the TypeScript engine.
- A Playwright smoke test plays one full team round across two browser contexts. No snapshot tests for animation.
