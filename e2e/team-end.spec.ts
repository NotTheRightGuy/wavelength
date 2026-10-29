import { expect, playTurn, restAs, roundRow, seatScores, setScore, shot, sql, startTeamGame, test } from './helpers'

test('team game end: winner, End screen, host-only rematch', async ({ make }) => {
  test.setTimeout(150_000)
  const { host, A, B, code } = await startTeamGame(make, { winning: 5 })
  expect(sql(`select winning_score from rooms where code='${code}'`)).toBe('5')
  setScore(code, 'Red', 3); setScore(code, 'Blue', 1)
  const r = await playTurn(A, [B], code, { off: 0 })
  expect(r.points).toBe(4)
  for (const p of [A, B, host]) {
    await expect(p.getByRole('heading', { name: 'Red wins' })).toBeVisible()
    await expect(p.getByLabel('Final scores')).toContainText('Blue')
  }
  await expect(host.getByLabel('Final scores').locator('li').first()).toContainText('Red')
  expect(seatScores(code)).toEqual({ Red: 7, Blue: 1 })
  expect(sql(`select status from rooms where code='${code}'`)).toBe('finished')
  await shot(A, 'end-team-420'); await shot(host, 'end-screen-1280')
  // rematch is host only
  await expect(A.getByTestId('rematch')).toHaveCount(0)
  expect(JSON.stringify(await restAs(A, 'rpc/rematch', { p_room: roundRow(code).room_id }))).toContain('host only')
  await host.getByTestId('rematch').click()
  await expect(A.getByTestId('card-option-0')).toBeVisible()
  await expect(B.getByText('Red is choosing a card')).toBeVisible()
  expect(seatScores(code)).toEqual({ Red: 0, Blue: 0 })
  expect(sql(`select status from rooms where code='${code}'`)).toBe('playing')
})

test('team catch-up: a bullseye while still behind gives the same team another turn', async ({ make }) => {
  test.setTimeout(180_000)
  const { host, A, B, code } = await startTeamGame(make)
  setScore(code, 'Red', 0); setScore(code, 'Blue', 8)
  const r1 = await playTurn(A, [B], code, { off: 0, lr: 'wrong' })
  expect(r1.points).toBe(4)
  await expect(host.getByTestId('next-turn')).toBeVisible()
  await expect.poll(() => seatScores(code)).toEqual({ Red: 4, Blue: 8 })
  await host.getByTestId('next-turn').click()
  await expect(A.getByRole('heading', { name: /Abe is the psychic/ })).toBeVisible() // Red again, next member
  await expect(A.getByTestId('scoreboard').locator('li', { hasText: 'Red' })).toHaveAttribute('aria-current', 'true')
  const r2 = await playTurn(A, [B], code, { off: 0, lr: 'wrong' })
  expect(r2.points).toBe(4)
  await expect.poll(() => seatScores(code)).toEqual({ Red: 8, Blue: 8 })
  await host.getByTestId('next-turn').click() // level now: Blue's turn
  await expect(B.getByTestId('card-option-0')).toBeVisible()
})

test('team sudden death: tie at the winning score, each tied team plays once, bigger gain wins', async ({ make }) => {
  test.setTimeout(240_000)
  const { host, A, B, code } = await startTeamGame(make)
  setScore(code, 'Red', 8); setScore(code, 'Blue', 10)
  const r1 = await playTurn(A, [B], code, { off: 8, lr: 'wrong' })
  expect(r1.points).toBe(2)
  for (const p of [A, B, host]) {
    await expect(p.getByRole('status').filter({ hasText: 'Sudden death' })).toBeVisible()
    await expect(p.getByText('Red and Blue are tied')).toBeVisible()
  }
  expect(seatScores(code)).toEqual({ Red: 10, Blue: 10 })
  await host.getByTestId('next-turn').click()
  await expect(A.getByTestId('card-option-0')).toBeVisible()
  const r2 = await playTurn(A, [B], code, { off: 0, lr: 'wrong' }) // Red gains 4
  expect(r2.points).toBe(4)
  await expect(host.getByTestId('next-turn')).toBeVisible()
  await host.getByTestId('next-turn').click()
  await expect(B.getByTestId('card-option-0')).toBeVisible()
  await playTurn(B, [A], code, { off: 40, lr: 'wrong' }) // Blue misses (0 gain; no +1 for tied Red either)
  for (const p of [A, B, host]) await expect(p.getByRole('heading', { name: 'Red wins' })).toBeVisible()
  expect((seatScores(code)).Red).toBeGreaterThan(seatScores(code).Blue)
  await shot(host, 'end-suddendeath-1280')
})
