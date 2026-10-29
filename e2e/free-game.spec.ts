import type { Page } from '@playwright/test'
import { assertNoLeak, bandPoints, dialTo, expect, psychicTurn, restAs, roundRow, seatScores, shot, sql, startFreeGame, targetOf, test } from './helpers'

const clampDial = (t: number, off: number) => Math.min(100, Math.max(0, Math.round(t + (t + off > 100 ? -off : off))))

test('free play: 3 players, hidden dials, averages, game over, shared win, rematch', async ({ make }) => {
  test.setTimeout(300_000)
  const { p1, p2, p3, code } = await startFreeGame(make, { laps: 1 })
  const pages: Record<string, Page> = { Pia: p1, Quin: p2, Rey: p3 }
  const exp: Record<string, number> = { Pia: 0, Quin: 0, Rey: 0 }
  const order = ['Pia', 'Quin', 'Rey']

  for (let r = 1; r <= 3; r++) {
    const psy = order[r - 1]
    const guessers = order.filter((n) => n !== psy)
    const ps = pages[psy]
    await expect(ps.getByRole('heading', { name: new RegExp(`${psy} is the psychic`) })).toBeVisible()
    for (const g of guessers) await expect(pages[g].getByText(`${psy} is choosing a card`)).toBeVisible()
    const target = await psychicTurn(ps, code, `clue${r}`)
    // guessers see the clue and an interactive dial; the psychic sees a lock counter
    for (const g of guessers) {
      await expect(pages[g].getByTestId('clue-text')).toHaveText(`“clue${r}”`)
      await expect(pages[g].getByRole('slider', { name: 'Guess dial' })).toBeVisible()
    }
    await expect(ps.getByText(`0 of 2 players have locked in`)).toBeVisible()
    if (r === 1) { await shot(p2, 'free-dial-420'); }
    const [g1, g2] = guessers
    const d1 = clampDial(target, r === 1 ? 0 : 30), d2 = clampDial(target, r === 3 ? 0 : 8)
    await assertNoLeak(pages[g1], code, target)
    // g2 locks first
    await dialTo(pages[g2], d2); await pages[g2].getByTestId('lock-dial').click()
    await expect(pages[g2].getByText('Locked in, waiting for 1 more')).toBeVisible()
    await expect(ps.getByText('1 of 2 players have locked in')).toBeVisible()
    // g1 cannot see g2's locked guess; g2 can see only its own; the psychic sees none
    expect(await restAs(pages[g1], `guesses?select=*&round_id=eq.${roundRow(code).id}`)).toEqual([])
    expect(await restAs(ps, `guesses?select=*&round_id=eq.${roundRow(code).id}`)).toEqual([])
    const own = await restAs(pages[g2], `guesses?select=*&round_id=eq.${roundRow(code).id}`)
    expect(own).toHaveLength(1)
    expect(Number(own[0].dial)).toBe(d2)
    const state = await restAs(pages[g1], 'rpc/get_room_state', { p_code: code })
    expect(state.guesses).toEqual([])
    await assertNoLeak(pages[g1], code, target); await assertNoLeak(pages[g2], code, target)
    if (r === 1) await shot(ps, 'free-psychic-wait-420')
    await dialTo(pages[g1], d1); await pages[g1].getByTestId('lock-dial').click()

    // auto reveal, scoring
    const pts = { [g1]: bandPoints(target, d1), [g2]: bandPoints(target, d2) }
    const psyPts = Math.round((pts[g1] + pts[g2]) / 2)
    exp[g1] += pts[g1]; exp[g2] += pts[g2]; exp[psy] += psyPts
    for (const n of order) await expect(pages[n].getByRole('heading', { name: /Bullseye!|So close!|In the zone|Missed it/ })).toBeVisible()
    await expect.poll(() => seatScores(code)).toEqual(exp)
    for (const n of order) for (const m of order) await expect(pages[n].getByTestId('scoreboard').locator('li', { hasText: m })).toHaveAttribute('aria-label', new RegExp(`: ${exp[m]} points`))
    // dials of everybody are readable after reveal; revealed target too
    expect((await restAs(pages[g1], `guesses?select=dial&round_id=eq.${roundRow(code).id}`)).length).toBe(2)
    expect(await restAs(pages[g1], `round_secrets?select=target&round_id=eq.${roundRow(code).id}`)).toEqual([{ target }])
    if (r === 1) await shot(p2, 'free-reveal-420')
    if (r < 3) { await expect(p1.getByTestId('next-turn')).toBeVisible(); await expect(p2.getByTestId('next-turn')).toHaveCount(0); await p1.getByTestId('next-turn').click() }
  }

  // --- game over after laps * players rounds
  await p1.getByTestId('next-turn').click()
  const top = Math.max(...Object.values(exp))
  const winners = order.filter((n) => exp[n] === top)
  const title = winners.length > 1 ? 'Shared win' : `${winners[0]} wins`
  for (const p of [p1, p2, p3]) await expect(p.getByRole('heading', { name: title })).toBeVisible()
  await expect(p1.getByLabel('Final scores')).toBeVisible()
  await shot(p2, 'end-420')
  await expect(p2.getByTestId('rematch')).toHaveCount(0)
  await expect(p2.getByText('Waiting for the host')).toBeVisible()
  expect(sql(`select status from rooms where code='${code}'`)).toBe('finished')

  // --- rematch resets scores and starts round 1
  await p1.getByTestId('rematch').click()
  await expect(p1.getByTestId('card-option-0')).toBeVisible()
  expect(seatScores(code)).toEqual({ Pia: 0, Quin: 0, Rey: 0 })
  expect(sql(`select count(*) from rounds r join rooms m on m.id=r.room_id where m.code='${code}'`)).toBe('1')
  await expect(p2.getByText('Pia is choosing a card')).toBeVisible()
})

test('free play: ties are shown as a shared win (End game with equal scores) and End game confirm can be cancelled', async ({ make }) => {
  const { p1, p2, p3, code } = await startFreeGame(make)
  sql(`update seats set score=5 where room_id=(select id from rooms where code='${code}')`)
  await p1.getByRole('button', { name: 'End game' }).click()
  await expect(p1.getByRole('dialog')).toContainText('End the game now?')
  await p1.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(p1.getByRole('dialog')).toHaveCount(0)
  expect(sql(`select status from rooms where code='${code}'`)).toBe('playing')
  await p1.getByRole('button', { name: 'End game' }).click()
  await p1.getByRole('dialog').getByRole('button', { name: 'End game' }).click()
  for (const p of [p1, p2, p3]) {
    await expect(p.getByRole('heading', { name: 'Shared win' })).toBeVisible()
    await expect(p.getByText(/^(Pia|Quin|Rey)(, (Pia|Quin|Rey)){2}$/)).toBeVisible()
  }
  // a non-host cannot end or rematch
  expect(JSON.stringify(await restAs(p2, 'rpc/rematch', { p_room: sql(`select id from rooms where code='${code}'`) }))).toContain('host only')
})
