import { assertNoLeak, createRoom, dialTo, expect, joinAndClaim, psychicTurn, restAs, roundRow, startFreeGame, startTeamGame, targetOf, test } from './helpers'

test('reconnect: reloading any player in each phase re-renders the right screen (session persists)', async ({ make }) => {
  test.setTimeout(180_000)
  const { host, A, B, code } = await startTeamGame(make)
  const reload = async (...ps: typeof A[]) => { for (const p of ps) await p.reload() }
  // card pick
  await reload(A, B, host)
  await expect(A.getByTestId('card-option-0')).toBeVisible()
  await expect(B.getByText('Red is choosing a card')).toBeVisible()
  await expect(host.getByText('Red is choosing a card')).toBeVisible()
  await expect(A.getByTestId('scoreboard')).toContainText('(you)')
  await A.getByTestId('card-option-0').click()
  // spin
  await expect(A.getByTestId('spin-for-me')).toBeVisible()
  await reload(A, B, host)
  await expect(A.getByTestId('spin-for-me')).toBeVisible()
  await expect(B.getByText('Red is spinning')).toBeVisible()
  await A.getByTestId('spin-for-me').click()
  // clue
  await expect(A.getByTestId('peek-target')).toBeVisible()
  await reload(A, B, host)
  await expect(A.getByTestId('clue-input')).toBeVisible()
  await expect(B.getByText('is thinking of a clue')).toBeVisible()
  await A.getByTestId('clue-input').fill('zebra'); await A.getByTestId('clue-submit').click()
  // dial
  await expect(B.getByText('Dialing it in')).toBeVisible()
  await reload(A, B, host)
  await expect(A.getByRole('slider', { name: 'Guess dial' })).toBeVisible()
  await expect(A.getByTestId('clue-text')).toHaveText('“zebra”')
  await expect(B.getByText('Dialing it in')).toBeVisible()
  await expect(host.getByTestId('board')).toBeVisible()
  await dialTo(A, 33); await A.getByTestId('lock-dial').click()
  // lr
  await expect(B.getByTestId('lr-left')).toBeVisible()
  await reload(A, B, host)
  await expect(A.getByText('Other teams are guessing left or right')).toBeVisible()
  await expect(B.getByTestId('lr-right')).toBeVisible()
  await expect(host.getByText('Left or right?')).toBeVisible()
  await expect(host.getByTestId('board')).toHaveAttribute('aria-valuenow', '33') // locked needle
  await B.getByTestId('lr-right').click()
  // reveal
  await expect(host.getByTestId('next-turn')).toBeVisible()
  await reload(A, B, host)
  for (const p of [A, B, host]) {
    await expect(p.getByRole('heading', { name: /Bullseye!|So close!|In the zone|Missed it/ })).toBeVisible()
    await expect(p.getByTestId('scoreboard')).toBeVisible()
  }
  await expect(host.getByTestId('next-turn')).toBeVisible()
  expect(roundRow(code).phase).toBe('reveal')
})

test('reconnect: a seated player reloading in the lobby keeps their seat', async ({ make }) => {
  const host = await make('host'), a = await make('a')
  const code = await createRoom(host, 'free')
  await joinAndClaim(a, code, { name: 'Pia' })
  await a.reload()
  await expect(a.getByTestId('seat-row').filter({ hasText: 'Pia' }).getByText('You')).toBeVisible()
  await expect(a.getByTestId('seat-name')).toHaveCount(0)
  await host.reload()
  await expect(host.getByTestId('start-game')).toBeVisible() // still the host
})

test('shared screen: non-member viewer follows the needle, never sees the target, watches the reveal', async ({ make }) => {
  test.setTimeout(150_000)
  const { A, B, code } = await startTeamGame(make, { screen: false })
  const v = await make('viewer', { viewport: { width: 1280, height: 720 } })
  await v.goto(`/screen/${code}`)
  await expect(v.getByText('Red is choosing a card')).toBeVisible()
  await expect(v.getByTestId('scoreboard')).toContainText('Red')
  await expect(v.getByTestId('next-turn')).toHaveCount(0)
  await expect(v.getByRole('toolbar', { name: 'Host controls' })).toHaveCount(0)
  const target = await psychicTurn(A, code, 'wave')
  await expect(v.getByTestId('clue-text')).toHaveText('“wave”')
  await dialTo(A, 64)
  await expect(v.getByTestId('board')).toHaveAttribute('aria-valuenow', '64')
  await dialTo(A, 21)
  await expect(v.getByTestId('board')).toHaveAttribute('aria-valuenow', '21')
  await assertNoLeak(v, code, target)
  await A.getByTestId('lock-dial').click()
  await expect(v.getByText('Left or right?')).toBeVisible()
  await expect(v.getByTestId('board')).toHaveAttribute('aria-valuenow', '21')
  await B.getByTestId('lr-left').click()
  await expect(v.getByRole('heading', { name: /Bullseye!|So close!|In the zone|Missed it/ })).toBeVisible()
  await expect(v.getByLabel('Round result')).toContainText('Red')
  expect(await restAs(v, 'round_secrets?select=target&round_id=eq.' + roundRow(code).id)).toEqual([{ target }])
  await expect(v.getByTestId('scoreboard').locator('li', { hasText: 'Red' })).toHaveAttribute('aria-label', /Red: \d+ points/)
})

test('shared screen: free play shows the locked-in counter updating for a viewer', async ({ make }) => {
  test.setTimeout(120_000)
  const { p1, p2, p3, code } = await startFreeGame(make)
  const v = await make('viewer', { viewport: { width: 1280, height: 720 } })
  await v.goto(`/screen/${code}`)
  await psychicTurn(p1, code)
  await expect(v.getByText('0 of 2 locked in')).toBeVisible()
  await dialTo(p2, 40); await p2.getByTestId('lock-dial').click()
  await expect(v.getByText('1 of 2 locked in')).toBeVisible({ timeout: 8000 })
  await dialTo(p3, 60); await p3.getByTestId('lock-dial').click()
  await expect(v.getByLabel('Round result')).toBeVisible()
})

test('settings sheet: mute and volume persist across reload', async ({ make }) => {
  const p = await make('p')
  await p.goto('/')
  await p.getByRole('button', { name: 'Settings' }).click()
  const sw = p.getByRole('switch')
  await expect(sw).not.toBeChecked()
  await sw.click()
  const vol = p.getByRole('slider', { name: 'Volume' })
  await vol.focus()
  for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowLeft')
  const shown = Number(await p.locator('span.tabular-nums').filter({ hasText: /^\d+$/ }).first().innerText())
  expect(shown).toBeLessThan(70)
  const saved = JSON.parse(await p.evaluate(() => localStorage.getItem('dialed.settings')!))
  expect(saved.muted).toBe(true)
  expect(Math.round(saved.volume * 100)).toBe(shown)
  await p.reload()
  await p.getByRole('button', { name: 'Settings' }).click()
  await expect(p.getByRole('switch')).toBeChecked()
  await expect(p.getByRole('slider', { name: 'Volume' })).toHaveValue(String(shown))
})

test('accessibility: board is a slider, keyboard moves it (arrows, shift, Home, End) and the page does not scroll', async ({ make }) => {
  const { A, code } = await startTeamGame(make, { screen: false })
  await psychicTurn(A, code)
  const board = A.getByRole('slider', { name: 'Guess dial' })
  await expect(board).toHaveAttribute('aria-valuemin', '0')
  await expect(board).toHaveAttribute('aria-valuemax', '100')
  await expect(board).toHaveAttribute('aria-valuenow', '50')
  await board.focus()
  const val = async () => Number(await board.getAttribute('aria-valuenow'))
  await A.evaluate(() => window.scrollTo(0, 40))
  const y0 = await A.evaluate(() => window.scrollY)
  await A.keyboard.press('ArrowRight'); expect(await val()).toBe(51)
  await A.keyboard.press('ArrowLeft'); await A.keyboard.press('ArrowLeft'); expect(await val()).toBe(49)
  await A.keyboard.press('Shift+ArrowRight'); expect(await val()).toBe(54)
  await A.keyboard.press('ArrowUp'); expect(await val()).toBe(55)
  await A.keyboard.press('ArrowDown'); expect(await val()).toBe(54)
  await A.keyboard.press('Home'); expect(await val()).toBe(0)
  await A.keyboard.press('ArrowLeft'); expect(await val()).toBe(0) // clamps
  await A.keyboard.press('End'); expect(await val()).toBe(100)
  await A.keyboard.press('ArrowRight'); expect(await val()).toBe(100)
  await A.keyboard.press('PageDown'); await A.keyboard.press('Space')
  expect(await A.evaluate(() => window.scrollY)).toBe(y0 === 0 ? 0 : y0) // arrow/Home/End never scrolled
  await expect(board).toHaveAttribute('aria-valuetext', 'Dial at 100 of 100')
})

test('motion enabled: dragging the crank about 3 turns finishes the spin', async ({ make }) => {
  test.setTimeout(90_000)
  const { A, code } = await startTeamGame(make, { reduced: false, screen: false })
  await A.getByTestId('card-option-0').click()
  const track = A.getByTestId('crank-track')
  await expect(track).toBeVisible()
  const b = (await track.boundingBox())!
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2, r = 56
  await A.mouse.move(cx + r, cy)
  await A.mouse.down()
  for (let deg = 0; deg <= 3 * 360; deg += 8) {
    const a = (deg * Math.PI) / 180
    await A.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a))
    await A.waitForTimeout(8)
  }
  await A.waitForTimeout(150)
  await A.mouse.up()
  await expect(A.getByTestId('clue-input')).toBeVisible({ timeout: 15_000 })
  expect(roundRow(code).phase).toBe('clue')
  expect(targetOf(code)).toBeGreaterThan(0)
})
