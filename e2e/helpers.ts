import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export { expect }

const env = Object.fromEntries(
  readFileSync(join(import.meta.dirname, '..', '.env.local'), 'utf8')
    .split('\n').filter((l) => l.startsWith('VITE_')).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]),
)
export const SUPABASE_URL = env.VITE_SUPABASE_URL
export const ANON_KEY = env.VITE_SUPABASE_ANON_KEY
export const SHOTS = join(import.meta.dirname, 'screenshots')
mkdirSync(SHOTS, { recursive: true })

// ---------------------------------------------------------------- database (local only)
export function sql(query: string): string {
  return execFileSync('docker', ['exec', 'supabase_db_dialed', 'psql', '-U', 'postgres', '-At', '-c', query], { encoding: 'utf8' }).trim()
}
export const roomId = (code: string) => sql(`select id from rooms where code='${code}'`)
export const targetOf = (code: string, round?: number): number =>
  Number(sql(`select s.target from round_secrets s join rounds r on r.id=s.round_id join rooms m on m.id=r.room_id where m.code='${code}' ${round ? `and r.number=${round}` : ''} order by r.number desc limit 1`))
export const setScore = (code: string, seatName: string, score: number) =>
  sql(`update seats set score=${score} where name='${seatName}' and room_id=(select id from rooms where code='${code}')`)
export const roundRow = (code: string) =>
  JSON.parse(sql(`select to_jsonb(r) from rounds r join rooms m on m.id=r.room_id where m.code='${code}' order by r.number desc limit 1`))
export const seatScores = (code: string): Record<string, number> =>
  Object.fromEntries(sql(`select name||':'||score from seats where room_id=(select id from rooms where code='${code}') order by position`).split('\n').map((l) => [l.split(':')[0], Number(l.split(':')[1])]))

export const bandPoints = (t: number, d: number) => { const e = Math.abs(t - d); return e <= 2 ? 4 : e <= 6 ? 3 : e <= 10 ? 2 : 0 }

// ---------------------------------------------------------------- players
export interface Player extends Page { bodies?: string[] }
export interface Opts { reduced?: boolean; viewport?: { width: number; height: number } }

export const test = base.extend<{ make: (name: string, opts?: Opts) => Promise<Page> }>({
  make: async ({ browser, baseURL }, use) => {
    const ctxs: BrowserContext[] = []
    await use(async (name, opts = {}) => {
      const ctx = await browser.newContext({ viewport: opts.viewport ?? { width: 420, height: 860 }, baseURL })
      ctxs.push(ctx)
      const page = await ctx.newPage()
      if (opts.reduced !== false) await page.emulateMedia({ reducedMotion: 'reduce' })
      ;(page as any).label = name
      ;(page as any).bodies = [] as string[]
      page.on('pageerror', (e) => console.log(`[${name}] pageerror: ${e.message}`))
      page.on('response', async (r) => {
        if (!r.url().includes('/rest/v1/') && !r.url().includes('/realtime/')) return
        try { ;(page as any).bodies.push(await r.text()) } catch { /* redirects etc. */ }
      })
      page.on('websocket', (ws) => ws.on('framereceived', (f) => { if (typeof f.payload === 'string') (page as any).bodies.push(f.payload) }))
      return page
    })
    for (const c of ctxs) await c.close()
  },
})

export const bodies = (p: Page): string[] => (p as any).bodies

export async function shot(p: Page, name: string) {
  await p.waitForTimeout(250)
  await p.screenshot({ path: join(SHOTS, `${name}.png`) })
}

// ---------------------------------------------------------------- REST as the page's own session
export async function restAs(p: Page, path: string, rpc?: Record<string, unknown>): Promise<any> {
  return p.evaluate(async ({ url, key, path, rpc }) => {
    const k = Object.keys(localStorage).find((x) => x.endsWith('-auth-token'))!
    const token = JSON.parse(localStorage.getItem(k)!).access_token
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method: rpc ? 'POST' : 'GET',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: rpc ? JSON.stringify(rpc) : undefined,
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch { return text }
  }, { url: SUPABASE_URL, key: ANON_KEY, path, rpc })
}

// ---------------------------------------------------------------- lobby helpers
export const codeFromUrl = (p: Page) => new URL(p.url()).pathname.split('/').pop()!

export async function createRoom(p: Page, mode: 'teams' | 'free'): Promise<string> {
  await p.goto('/')
  await p.getByTestId(mode === 'teams' ? 'create-teams' : 'create-free').click()
  await expect(p).toHaveURL(/\/r\/[A-Z]{4}$/)
  await expect(p.getByTestId('room-code')).toBeVisible()
  return codeFromUrl(p)
}

export async function joinAndClaim(p: Page, code: string, o: { name: string; members?: string[]; color?: string; mode?: 'teams' | 'free' }) {
  await p.goto(`/r/${code}`)
  await p.getByTestId('seat-name').fill(o.name)
  for (const m of o.members ?? []) {
    await p.getByTestId('member-input').fill(m)
    await p.getByTestId('add-member').click()
  }
  if (o.color) await p.getByRole('radio', { name: o.color }).click()
  await p.getByTestId('claim-seat').click()
  await expect(p.getByTestId('seat-row').filter({ hasText: o.name }).getByText('You')).toBeVisible()
}

export interface Teams { host: Page; A: Page; B: Page; code: string }

/** Host creates a Teams room (and later watches on /screen), Red (Ann, Abe) and Blue (Bo) claim seats and the game starts. */
export async function startTeamGame(make: (n: string, o?: Opts) => Promise<Page>, o: { timer?: number; winning?: number; reduced?: boolean; screen?: boolean } = {}): Promise<Teams> {
  const host = await make('host', { viewport: { width: 1280, height: 720 }, reduced: o.reduced })
  const A = await make('Red', { reduced: o.reduced })
  const B = await make('Blue', { reduced: o.reduced })
  const code = await createRoom(host, 'teams')
  if (o.winning && o.winning !== 10) {
    for (let i = 10; i > o.winning; i--) await host.getByRole('button', { name: 'Decrease Winning score' }).click()
    await expect(host.getByTestId('setting-value')).toHaveText(String(o.winning))
  }
  if (o.timer) await host.getByRole('radio', { name: String(o.timer), exact: true }).click()
  await joinAndClaim(A, code, { name: 'Red', members: ['Ann', 'Abe'] })
  await joinAndClaim(B, code, { name: 'Blue', members: ['Bo'] })
  await expect(host.getByTestId('seat-row')).toHaveCount(2)
  await host.getByTestId('start-game').click()
  if (o.screen !== false) await host.goto(`/screen/${code}`)
  await expect(A.getByTestId('card-option-0')).toBeVisible()
  return { host, A, B, code }
}

export interface Free { p1: Page; p2: Page; p3: Page; code: string }
export async function startFreeGame(make: (n: string, o?: Opts) => Promise<Page>, o: { laps?: number; timer?: number } = {}): Promise<Free> {
  const [p1, p2, p3] = [await make('P1'), await make('P2'), await make('P3')]
  const code = await createRoom(p1, 'free')
  if (o.laps) for (let i = 2; i > o.laps; i--) await p1.getByRole('button', { name: 'Decrease Laps' }).click()
  if (o.timer) await p1.getByRole('radio', { name: String(o.timer), exact: true }).click()
  await joinAndClaim(p1, code, { name: 'Pia' })
  await joinAndClaim(p2, code, { name: 'Quin' })
  await joinAndClaim(p3, code, { name: 'Rey' })
  await expect(p1.getByTestId('seat-row')).toHaveCount(3)
  await p1.getByTestId('start-game').click()
  await expect(p1.getByTestId('card-option-0')).toBeVisible()
  return { p1, p2, p3, code }
}

// ---------------------------------------------------------------- round driving
export async function dialTo(p: Page, value: number) {
  const board = p.getByRole('slider', { name: 'Guess dial' })
  await expect(board).toBeVisible()
  await board.focus()
  const from = Number(await board.getAttribute('aria-valuenow'))
  const diff = Math.round(value) - from
  const big = Math.floor(Math.abs(diff) / 5), small = Math.abs(diff) % 5
  const key = diff >= 0 ? 'ArrowRight' : 'ArrowLeft'
  for (let i = 0; i < big; i++) await p.keyboard.press(`Shift+${key}`)
  for (let i = 0; i < small; i++) await p.keyboard.press(key)
  await expect(board).toHaveAttribute('aria-valuenow', String(Math.round(value)))
}

/** Active seat: pick card, spin, peek, clue -> dial phase. Returns the target (read from the database). */
export async function psychicTurn(p: Page, code: string, clue = 'banana', opt = 0): Promise<number> {
  await p.getByTestId(`card-option-${opt}`).click()
  await p.getByTestId('spin-for-me').click()
  await expect(p.getByTestId('clue-input')).toBeVisible()
  const target = targetOf(code)
  await p.getByTestId('clue-input').fill(clue)
  await p.getByTestId('clue-submit').click()
  return target
}

/** Team round after the psychic turn: active sets dial (target + offset), locks, other teams guess L/R. */
export async function teamGuess(active: Page, others: Page[], target: number, offset: number, lr: 'left' | 'right') {
  const dial = Math.min(100, Math.max(0, Math.round(target + offset)))
  await dialTo(active, dial)
  await active.getByTestId('lock-dial').click()
  for (const o of others) await o.getByTestId(`lr-${lr}`).click()
  return dial
}

export const scoreOf = async (p: Page, name: string) => {
  const li = p.getByTestId('scoreboard').locator('li', { hasText: name }).first()
  const label = (await li.getAttribute('aria-label'))!
  return Number(/: (\d+) points/.exec(label)![1])
}

export const wedges = (p: Page) => p.getByTestId('board').locator('path[stroke-opacity="0.7"]')

export async function peekHold(p: Page) {
  const box = (await p.getByTestId('peek-target').boundingBox())!
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await p.mouse.down()
  await expect(wedges(p)).toHaveCount(5)
  return async () => { await p.mouse.up(); await expect(wedges(p)).toHaveCount(0) }
}

const asText = (n: number) => String(n)
/** Assert the (not yet revealed) target is not reachable from this context: REST, RPC, DOM and every response body so far. */
export async function assertNoLeak(p: Page, code: string, target: number) {
  const rid = roundRow(code).id
  expect(await restAs(p, `round_secrets?select=*&round_id=eq.${rid}`)).toEqual([])
  expect(await restAs(p, 'rpc/get_target', { p_round: rid })).toBeNull()
  const re = new RegExp(`(?<![\\d.])${asText(target).replace('.', '\\.')}(?!\\d)`)
  expect(await p.content()).not.toMatch(re)
  expect(bodies(p).join('\n')).not.toMatch(re)
}

/** One full team turn from card pick to reveal. `lr: 'wrong'` makes the other teams guess the wrong side. */
export async function playTurn(active: Page, others: Page[], code: string, o: { off: number; lr?: 'left' | 'right' | 'wrong'; clue?: string }) {
  const t = await psychicTurn(active, code, o.clue ?? 'clue')
  const dial = Math.min(100, Math.max(0, Math.round(t + o.off)))
  const correct = t < dial ? 'left' : 'right'
  const lr = o.lr === 'wrong' || !o.lr ? (correct === 'left' ? 'right' : 'left') : o.lr
  await dialTo(active, dial)
  await active.getByTestId('lock-dial').click()
  for (const p of others) await p.getByTestId(`lr-${lr}`).click()
  return { target: t, dial, points: bandPoints(t, dial) }
}
