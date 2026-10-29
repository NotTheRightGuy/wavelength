import { dialTo, expect, psychicTurn, roundRow, seatScores, sql, startTeamGame, test } from './helpers'

test('host controls: Skip turn reveals from the dial phase and from the left/right phase', async ({ make }) => {
  test.setTimeout(150_000)
  const { host, A, B, code } = await startTeamGame(make)
  const skip = host.getByRole('button', { name: 'Skip turn' })
  await expect(host.getByRole('toolbar', { name: 'Host controls' })).toBeVisible()
  await expect(skip).toHaveCount(0) // not in card pick
  await psychicTurn(A, code)
  await expect(B.getByText('Dialing it in')).toBeVisible()
  await expect(skip).toBeVisible()
  await skip.click()
  for (const p of [A, B, host]) await expect(p.getByRole('heading', { name: 'Missed it' })).toBeVisible()
  expect(seatScores(code)).toEqual({ Red: 0, Blue: 0 })
  expect(roundRow(code).result.entries).toEqual([]) // nobody guessed
  await expect(skip).toHaveCount(0) // not in reveal
  await host.getByTestId('next-turn').click()
  // lr phase
  await psychicTurn(B, code)
  await dialTo(B, 50); await B.getByTestId('lock-dial').click()
  await expect(A.getByTestId('lr-left')).toBeVisible()
  await skip.click()
  for (const p of [A, B, host]) await expect(p.getByTestId('scoreboard')).toBeVisible()
  await expect.poll(() => roundRow(code).phase).toBe('reveal')
  expect(roundRow(code).result.entries.find((e: any) => e.lr_correct)).toBeUndefined()
})

test('host controls: auto-advance ~8 s after reveal, Pause auto-next stops it, Resume restores it', async ({ make }) => {
  test.setTimeout(150_000)
  const { host, A, B, code } = await startTeamGame(make)
  await psychicTurn(A, code)
  await dialTo(A, 50); await A.getByTestId('lock-dial').click()
  await B.getByTestId('lr-left').click()
  await expect(host.getByTestId('next-turn')).toBeVisible()
  await host.getByRole('button', { name: 'Pause auto-next' }).first().click()
  await expect(host.getByRole('button', { name: 'Resume auto-next' }).first()).toHaveAttribute('aria-pressed', 'true').catch(() => undefined)
  await host.waitForTimeout(14_000) // 3.5 s ceremony + 8 s auto-next + slack
  expect(roundRow(code).number).toBe(1)
  await expect(host.getByTestId('next-turn')).toBeVisible()
  await host.getByRole('button', { name: 'Resume auto-next' }).first().click()
  await expect(B.getByTestId('card-option-0')).toBeVisible({ timeout: 15_000 }) // moved to Blue automatically
  expect(roundRow(code).number).toBe(2)
})

test('host controls: pass host moves the controls, new host can end the game (confirm dialog)', async ({ make }) => {
  test.setTimeout(120_000)
  const { host, A, B, code } = await startTeamGame(make)
  await expect(host.getByRole('toolbar', { name: 'Host controls' })).toBeVisible()
  for (const p of [A, B]) await expect(p.getByRole('toolbar', { name: 'Host controls' })).toHaveCount(0)
  await host.getByRole('button', { name: 'Pass host' }).click()
  await host.getByRole('dialog').getByRole('button', { name: 'Blue' }).click()
  await host.getByRole('dialog').getByRole('button', { name: 'Pass host' }).click()
  await expect(B.getByRole('toolbar', { name: 'Host controls' })).toBeVisible()
  await expect(host.getByRole('toolbar', { name: 'Host controls' })).toHaveCount(0)
  // old host can no longer act
  const rid = roundRow(code).room_id
  expect(sql(`select count(*) from rooms where code='${code}' and host_session=(select session_id from seats where name='Blue' and room_id='${rid}')`)).toBe('1')
  await B.getByRole('button', { name: 'End game' }).click()
  await B.getByRole('dialog').getByRole('button', { name: 'End game' }).click()
  for (const p of [A, B, host]) await expect(p.getByLabel('Final scores')).toBeVisible()
  await expect(B.getByTestId('rematch')).toBeVisible()
  await expect(host.getByTestId('rematch')).toHaveCount(0)
})

test('timer: ring counts down from 60 and the active device auto-locks once at the deadline', async ({ make }) => {
  test.setTimeout(120_000)
  const { host, A, B, code } = await startTeamGame(make, { timer: 60 })
  expect(sql(`select timer_secs from rooms where code='${code}'`)).toBe('60')
  await psychicTurn(A, code)
  for (const p of [A, B, host]) {
    const label = await p.getByRole('timer').first().getAttribute('aria-label').catch(() => null)
    const n = Number(label?.match(/\d+/)?.[0] ?? (await p.getByRole('timer').first().innerText()))
    expect(n).toBeGreaterThan(50); expect(n).toBeLessThanOrEqual(60)
  }
  sql(`update rounds set dial_deadline = now() + interval '3 seconds' where id='${roundRow(code).id}'`)
  await expect(B.getByTestId('lr-left')).toBeVisible({ timeout: 15_000 }) // A auto-locked
  expect(sql(`select count(*) from guesses where round_id='${roundRow(code).id}' and dial is not null`)).toBe('1')
  expect(sql(`select dial from guesses where round_id='${roundRow(code).id}' and dial is not null`)).toBe('50')
})

test('timer: host fallback reveals 5 s after the deadline when the active device never locks', async ({ make }) => {
  test.setTimeout(120_000)
  const { host, A, B, code } = await startTeamGame(make, { timer: 60 })
  await psychicTurn(A, code)
  await expect(B.getByText('Dialing it in')).toBeVisible()
  await A.context().setOffline(true) // active phone dies
  const t0 = Date.now()
  sql(`update rounds set dial_deadline = now() - interval '1 second' where id='${roundRow(code).id}'`)
  await expect(host.getByRole('heading', { name: 'Missed it' })).toBeVisible({ timeout: 20_000 })
  expect(Date.now() - t0).toBeGreaterThan(3000) // waited for the grace period
  await expect(B.getByRole('heading', { name: 'Missed it' })).toBeVisible()
  expect(roundRow(code).phase).toBe('reveal')
  expect(sql(`select count(*) from guesses where round_id='${roundRow(code).id}'`)).toBe('0')
  await A.context().setOffline(false)
})
