# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Friends gathered in the same room (a living room, a party) playing together on their phones. In team mode each team shares one device and passes it around; in free play each person uses their own phone. An optional shared big screen (laptop or TV) shows the board, the reveal and the scoreboard for everyone. The host is whoever creates the room and often runs the big screen. Players are casual: they must be able to join in seconds with a 4-letter code or a QR scan, with no accounts.

## Product Purpose
Dialed is an online-room-code party game in the spirit of Wavelength. A psychic secretly sees a target on a spectrum between two opposite ideas (for example Hot / Cold) and gives a one-line clue; their team then drags a dial to where they think the target sits, and other teams guess whether it is left or right of that guess. Success is a loud, laughing, argue-over-the-needle room, and a reveal moment everyone watches together.

## Positioning
The tactile, physical-board-game feel on phones: a real cranked target wheel, a shutter that closes and springs open, a chunky dial and plastic-feeling controls, with live needle movement synced across every screen. It is our own game under our own name ("Dialed"), not the official product.

## Operating Context
Same room, several devices at once, often noisy and social, sometimes dim lighting and viewed across a room on the shared screen. One device per team means the screen is shared and passed around, with a pass-and-peek flow so only the psychic sees the secret target. Mobile-first (about 420px wide), touch dragging for the dial and crank, with keyboard and button alternatives.

## Capabilities and Constraints
- Team mode: 2-6 teams, one device per team; free play: 3-12 players, one device each.
- Rooms are created and joined by a 4-letter code or QR; the host controls settings, kicking, and moving the game along.
- The secret target must never reach any screen but the psychic's before the reveal.
- Motion (the `motion` library) for animation; sounds are generated in code with Web Audio; mute and volume persist per device; haptics where supported; reduced-motion users get short fades instead of spins and springs; every drag has a button or keyboard alternative.
- Stack is fixed: Vite, React 19, TypeScript, Tailwind 4, shadcn (base-nova, Base UI primitives), Supabase backend.

## Brand Commitments
- The public name is "Dialed" (the codename "Wavelength" never appears in user-visible copy).
- Nothing may be copied from the official Wavelength game: no logo, artwork, card wording or exact board look. The classic semicircle board, coloured scoring wedges (orange 4, yellow 3, blue 2) and a red needle are the agreed colour language.
- Tone: warm, tactile and playful, like a physical board game on a table.

## Evidence on Hand
No logo, illustrations or photography exist; the deck of 192 original card pairs is in `src/data/cards.ts`. Absences to respect: no testimonials, player counts or press may be invented.

## Product Principles
- The room is the product: every screen should help a group laugh together, and the shared moments (reveal, scoreboard) outrank solo polish.
- Feel physical: depth, weight, springs and sound make controls feel like plastic and cardboard.
- Never leak the secret: design the peek, the shutter and the waiting states so nobody can see what they should not.
- Zero-friction joining: a code, a name and a colour are all it takes.
- Playful never means unreadable: text stays large and legible across a room.

## Accessibility & Inclusion
Meet WCAG AA contrast, support reduced motion, keep touch targets large (at least 44px), and provide keyboard or button alternatives to every drag. Do not rely on colour alone to tell teams apart (add names or icons).
