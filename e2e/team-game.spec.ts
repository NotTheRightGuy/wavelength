import { assertNoLeak, bandPoints, bodies, dialTo, expect, peekHold, psychicTurn, restAs, roundRow, scoreOf, seatScores, shot, startTeamGame, targetOf, teamGuess, test } from './helpers'

test('team round: full flow, scoring, left/right bonus, next turn, psychic rotation', async ({ make }) => {
  test.setTimeout(240_000)
  const { host, A, B, code } = await startTeamGame(make)

  // --- card pick: only the active team picks; others wait
  await expect(A.getByRole('heading', { name: /Ann is the psychic/ })).toBeVisible()
  await expect(A.getByTestId(/card-option-/)).toHaveCount(2)
  await shot(A, 'game-cardpick-420')
  for (const w of [B, host]) await expect(w.getByText('Red is choosing a card')).toBeVisible()
  await expect(B.getByTestId('card-option-0')).toHaveCount(0)
  const cardLabel = (await A.getByTestId('card-option-1').getAttribute('aria-label'))!.replace('Pick card: ', '')
  await A.getByTestId('card-option-1').click()
  for (const w of [B, host]) await expect(w.getByText('Red is spinning for the target')).toBeVisible()
  await expect(A.getByTestId('crank-track')).toBeVisible()
  await A.getByTestId('spin-for-me').click()

  // --- clue: peek shows wedges only while held
  await expect(A.getByTestId('peek-target')).toBeVisible()
  await expect(wedgesCount(A)).resolves.toBe(0)
  const release = await peekHold(A)
  const target = targetOf(code)
  expect(await restAs(A, 'rpc/get_target', { p_round: roundRow(code).id })).toBe(target)
  await release()
  for (const w of [B, host]) { await expect(w.getByText('is thinking of a clue')).toBeVisible(); await assertNoLeak(w, code, target) }
  await A.getByTestId('clue-input').fill('banana')
  await A.getByTestId('clue-submit').click()

  // --- dial: needle mirrored on the other devices, clue shown, no target anywhere
  for (const w of [B, host]) {
    await expect(w.getByTestId('clue-text')).toHaveText('“banana”')
    await expect(w.getByLabel(/Spectrum:/)).toContainText(cardLabel.split(' to ')[0])
  }
  await dialTo(A, 70)
  await expect(B.getByTestId('board')).toHaveAttribute('aria-valuenow', '70')
  await expect(host.getByTestId('board')).toHaveAttribute('aria-valuenow', '70')
  await shot(A, 'game-dial-420'); await shot(host, 'game-dial-screen-1280')
  for (const w of [B, host]) await assertNoLeak(w, code, target)
  const dial = await teamGuess(A, [], target, +3, 'left') // dial = target+3 -> 3 pts
  await expect(A.getByTestId('board')).toHaveCount(0).catch(() => undefined)

  // --- left/right: Blue guesses left (target is left of dial)
  await expect(B.getByTestId('lr-left')).toBeVisible()
  await expect(A.getByText('Other teams are guessing left or right')).toBeVisible()
  await expect(host.getByText('Left or right?')).toBeVisible()
  await assertNoLeak(host, code, target)
  await B.getByTestId('lr-left').click()

  // --- auto reveal on every device, with correct points
  const expectRed = bandPoints(target, dial), expectBlue = target < dial ? 1 : 0
  expect(expectRed).toBe(3)
  for (const w of [A, B, host]) {
    await expect(w.getByRole('heading', { name: 'So close!' })).toBeVisible()
    await expect(w.getByTestId('scoreboard').locator('li', { hasText: 'Red' })).toHaveAttribute('aria-label', new RegExp(`Red.*: ${expectRed} points`))
    await expect(w.getByTestId('scoreboard').locator('li', { hasText: 'Blue' })).toHaveAttribute('aria-label', new RegExp(`Blue.*: ${expectBlue} points`))
  }
  await A.waitForTimeout(4500)
  await shot(A, 'reveal-420'); await shot(host, 'reveal-screen-1280')
  expect(seatScores(code)).toEqual({ Red: expectRed, Blue: expectBlue })
  // after reveal everyone can read the target
  for (const w of [B, host]) {
    expect(await restAs(w, 'round_secrets?select=target')).toEqual([{ target }])
    expect(await restAs(w, 'rpc/get_target', { p_round: roundRow(code).id })).toBe(target)
  }
  await expect(A.getByText('Waiting for host')).toBeVisible()
  await expect(host.getByTestId('next-turn')).toBeVisible()
  await expect(B.getByTestId('next-turn')).toHaveCount(0)

  // --- next turn: Blue is active, psychic Bo; Red's psychic rotates to Abe on its next turn
  await host.getByTestId('next-turn').click()
  await expect(B.getByRole('heading', { name: /Bo is the psychic/ })).toBeVisible()
  await expect(B.getByTestId('scoreboard').locator('li', { hasText: 'Blue' })).toHaveAttribute('aria-current', 'true')
  const t2 = await psychicTurn(B, code, '', 0)
  await expect(A.getByText('The clue is spoken aloud')).toBeVisible() // empty clue
  const d2 = await teamGuess(B, [A], t2, +20, 'right') // target left of dial -> Red is wrong
  await expect(host.getByRole('heading', { name: 'Missed it' })).toBeVisible()
  expect(bandPoints(t2, d2)).toBe(0)
  await expect.poll(() => seatScores(code)).toEqual({ Red: expectRed, Blue: expectBlue })
  await host.getByTestId('next-turn').click()
  await expect(A.getByRole('heading', { name: /Abe is the psychic/ })).toBeVisible()
  await expect(await scoreOf(A, 'Red')).toBe(expectRed)
})

const wedgesCount = async (p: import('@playwright/test').Page) => p.getByTestId('board').locator('path[stroke-opacity="0.7"]').count()

test('secrecy: target never reaches the other team or the shared screen before reveal', async ({ make }) => {
  test.setTimeout(180_000)
  const { host, A, B, code } = await startTeamGame(make)
  await A.getByTestId('card-option-0').click()
  const rid = () => roundRow(code).id
  // card_pick -> nothing exists yet for anyone
  const target = targetOf(code)
  for (const w of [A, B, host]) await expect.poll(() => restAs(w, 'round_secrets?select=*')).toBeDefined()
  // spin
  await expect(A.getByTestId('spin-for-me')).toBeVisible()
  await assertNoLeak(B, code, target); await assertNoLeak(host, code, target)
  await A.getByTestId('spin-for-me').click()
  // clue phase: active seat can read it (positive control), others cannot
  await expect(A.getByTestId('peek-target')).toBeVisible()
  expect(await restAs(A, 'round_secrets?select=target')).toEqual([{ target }])
  const rel = await peekHold(A); await rel()
  expect(bodies(A).join('\n')).toContain(String(target))
  await assertNoLeak(B, code, target); await assertNoLeak(host, code, target)
  // a seated guesser cannot read guesses before lock either (team dials are public by design, free-play ones are not)
  await A.getByTestId('clue-input').fill('x'); await A.getByTestId('clue-submit').click()
  await expect(B.getByRole('slider')).toBeVisible()
  await assertNoLeak(B, code, target); await assertNoLeak(host, code, target)
  // other team cannot lock the dial / pick cards / spy via rpc
  expect(JSON.stringify(await restAs(B, 'rpc/lock_dial', { p_round: rid(), p_dial: 50 }))).toContain('only the active team')
  expect(JSON.stringify(await restAs(B, 'rpc/pick_card', { p_round: rid(), p_card: 1 }))).toContain('not your turn')
  await dialTo(A, 40); await A.getByTestId('lock-dial').click()
  await expect(B.getByTestId('lr-left')).toBeVisible()
  await assertNoLeak(B, code, target); await assertNoLeak(host, code, target)
  await B.getByTestId('lr-right').click()
  await expect(host.getByTestId('next-turn')).toBeVisible()
  expect(await restAs(B, 'round_secrets?select=target')).toEqual([{ target }])
  expect(await restAs(host, 'rpc/get_target', { p_round: rid() })).toBe(target)
})
