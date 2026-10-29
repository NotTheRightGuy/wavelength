import { expect, test, joinAndClaim, createRoom, shot, sql, restAs } from './helpers'

test.describe('Home', () => {
  test('home: create Teams room shows a 4-letter code', async ({ make }) => {
    const p = await make('h')
    await p.goto('/')
    await shot(p, 'home-420')
    const code = await createRoom(p, 'teams')
    expect(code).toMatch(/^[A-Z]{4}$/)
    await expect(p.getByTestId('room-code')).toHaveAttribute('aria-label', `Room code ${code}`)
    await expect(p.getByRole('heading', { name: 'Team game' })).toBeVisible()
  })

  test('home: create Free play room shows a 4-letter code', async ({ make }) => {
    const p = await make('h')
    const code = await createRoom(p, 'free')
    expect(code).toMatch(/^[A-Z]{4}$/)
    await expect(p.getByRole('heading', { name: 'Free play' })).toBeVisible()
    expect(sql(`select mode from rooms where code='${code}'`)).toBe('free')
  })

  test('home: join by typing a lower-case code is normalised', async ({ make }) => {
    const host = await make('host'), p = await make('p')
    const code = await createRoom(host, 'teams')
    await p.goto('/')
    await expect(p.getByTestId('join-btn')).toBeDisabled()
    await p.getByTestId('join-code').pressSequentially(code.toLowerCase())
    await expect(p.getByTestId('join-code')).toHaveValue(code)
    await p.getByTestId('join-btn').click()
    await expect(p).toHaveURL(new RegExp(`/r/${code}$`))
    await expect(p.getByTestId('room-code')).toHaveAttribute('aria-label', `Room code ${code}`)
  })

  test('home: unknown code shows an error', async ({ make }) => {
    const p = await make('p')
    await p.goto('/')
    await p.getByTestId('join-code').fill('IIII') // I is never generated
    await p.getByTestId('join-btn').click()
    await expect(p.getByText('Room not found').first()).toBeVisible()
    await expect(p).toHaveURL(/\/$/)
    await p.goto('/r/IIII')
    await expect(p.getByRole('heading', { name: 'Room not found' })).toBeVisible()
  })
})

test.describe('Lobby', () => {
  test('lobby: QR code present and encodes the join URL', async ({ make }) => {
    const p = await make('h')
    const code = await createRoom(p, 'teams')
    await expect(p.getByTestId('qr-join').locator('svg')).toBeVisible()
    await expect(p.getByLabel(`QR code to join room ${code}`)).toBeVisible()
    await expect(p.getByRole('link', { name: 'Open shared screen' })).toHaveAttribute('href', `/screen/${code}`)
  })

  test('lobby: claim seat with name, colour and members; colour not reusable; edit seat', async ({ make }) => {
    const host = await make('host'), a = await make('a'), b = await make('b')
    const code = await createRoom(host, 'teams')
    await joinAndClaim(a, code, { name: 'Red', members: ['Ann', 'Abe'], color: '#e2383f' })
    await expect(host.getByTestId('seat-row').filter({ hasText: 'Red' })).toContainText('Ann, Abe')
    // b: the taken colour is disabled in the picker
    await b.goto(`/r/${code}`)
    await expect(b.getByTestId('seat-row')).toHaveCount(1)
    await expect(b.getByRole('radio', { name: '#e2383f' })).toBeDisabled()
    await expect(b.getByRole('radio', { name: '#2f63e0' })).toBeEnabled()
    await shot(b, 'lobby-420')
    // claim button needs a member in teams mode
    await b.getByTestId('seat-name').fill('Blue')
    await expect(b.getByTestId('claim-seat')).toBeDisabled()
    await b.getByTestId('member-input').fill('Bo')
    await b.getByTestId('claim-seat').click() // pending draft member is included
    await expect(b.getByTestId('seat-row').filter({ hasText: 'Blue' })).toContainText('Bo')
    const colours = sql(`select color from seats where room_id=(select id from rooms where code='${code}') order by position`).split('\n')
    expect(new Set(colours).size).toBe(2)
    // edit seat
    await a.getByRole('button', { name: 'Edit' }).click()
    await a.getByTestId('seat-name').fill('Crimson')
    await a.getByTestId('member-input').fill('Amy')
    await a.getByTestId('add-member').click()
    await a.getByTestId('claim-seat').click()
    await expect(a.getByTestId('seat-row').filter({ hasText: 'Crimson' })).toContainText('Ann, Abe, Amy')
    await expect(host.getByTestId('seat-row').filter({ hasText: 'Crimson' })).toBeVisible()
  })

  test('lobby: host settings persist after reload', async ({ make }) => {
    const host = await make('host')
    const code = await createRoom(host, 'teams')
    await host.getByRole('button', { name: 'Increase Winning score' }).click()
    await host.getByRole('button', { name: 'Increase Winning score' }).click()
    await host.getByRole('radio', { name: '90', exact: true }).click()
    await expect(host.getByTestId('setting-value')).toHaveText('12')
    await expect.poll(() => sql(`select winning_score||'/'||timer_secs from rooms where code='${code}'`)).toBe('12/90')
    await host.reload()
    await expect(host.getByTestId('setting-value')).toHaveText('12')
    await expect(host.getByRole('radio', { name: '90', exact: true })).toHaveAttribute('aria-checked', 'true')
    // free play: laps
    const f = await make('f')
    const fc = await createRoom(f, 'free')
    await f.getByRole('button', { name: 'Increase Laps' }).click()
    await f.getByRole('radio', { name: '60', exact: true }).click()
    await expect.poll(() => sql(`select laps||'/'||timer_secs from rooms where code='${fc}'`)).toBe('3/60')
    await f.reload()
    await expect(f.getByTestId('setting-value')).toHaveText('3')
    // bounds: winning score min 5
    for (let i = 0; i < 10; i++) if (await host.getByRole('button', { name: 'Decrease Winning score' }).isEnabled()) await host.getByRole('button', { name: 'Decrease Winning score' }).click()
    await expect(host.getByTestId('setting-value')).toHaveText('5')
    await expect(host.getByRole('button', { name: 'Decrease Winning score' })).toBeDisabled()
  })

  test('lobby: kick a seat, kicked device can re-claim', async ({ make }) => {
    const host = await make('host'), a = await make('a')
    const code = await createRoom(host, 'free')
    await joinAndClaim(a, code, { name: 'Pia' })
    await expect(host.getByTestId('seat-row').filter({ hasText: 'Pia' })).toBeVisible()
    await host.getByRole('button', { name: 'Kick Pia' }).click()
    await expect(host.getByTestId('seat-row')).toHaveCount(0)
    await expect(a.getByTestId('seat-name')).toBeVisible({ timeout: 8000 }) // polled; claim form is back
    await a.getByTestId('seat-name').fill('Pia2')
    await a.getByTestId('claim-seat').click()
    await expect(host.getByTestId('seat-row').filter({ hasText: 'Pia2' })).toBeVisible()
  })

  test('lobby: start gating in teams mode (2 teams with members)', async ({ make }) => {
    const host = await make('host'), a = await make('a'), b = await make('b')
    const code = await createRoom(host, 'teams')
    await expect(host.getByTestId('start-game')).toBeDisabled()
    await joinAndClaim(a, code, { name: 'Red', members: ['Ann'] })
    await expect(host.getByTestId('seat-row')).toHaveCount(1)
    await expect(host.getByTestId('start-game')).toBeDisabled()
    await expect(host.getByText('Need 1 more team to start')).toBeVisible()
    await joinAndClaim(b, code, { name: 'Blue', members: ['Bo'] })
    await expect(host.getByTestId('start-game')).toBeEnabled()
    // a team with no members blocks start (set via db: UI cannot create one)
    sql(`update seats set members='{}' where name='Blue' and room_id=(select id from rooms where code='${code}')`)
    await expect(host.getByTestId('start-game')).toBeDisabled({ timeout: 8000 })
    await expect(host.getByText('Every team needs at least one member')).toBeVisible()
    // the RPC itself also refuses
    const res = await restAs(host, 'rpc/start_game', { p_room: sql(`select id from rooms where code='${code}'`) })
    expect(JSON.stringify(res)).toContain('every team needs')
  })

  test('lobby: start gating in free play needs 3 players', async ({ make }) => {
    const host = await make('host'), a = await make('a'), b = await make('b')
    const code = await createRoom(host, 'free')
    await joinAndClaim(host, code, { name: 'Pia' })
    await joinAndClaim(a, code, { name: 'Quin' })
    await expect(host.getByTestId('start-game')).toBeDisabled()
    await expect(host.getByText('Need 1 more player to start')).toBeVisible()
    await joinAndClaim(b, code, { name: 'Rey' })
    await expect(host.getByTestId('start-game')).toBeEnabled()
  })

  test('lobby: non-host sees no host controls; joiner without a seat sees newly claimed seats by polling', async ({ make }) => {
    const host = await make('host'), a = await make('a'), watcher = await make('w')
    const code = await createRoom(host, 'free')
    await watcher.goto(`/r/${code}`) // not seated
    await expect(watcher.getByTestId('seat-name')).toBeVisible()
    await joinAndClaim(a, code, { name: 'Pia' })
    await expect(watcher.getByTestId('seat-row').filter({ hasText: 'Pia' })).toBeVisible({ timeout: 8000 })
    for (const p of [watcher, a]) {
      await expect(p.getByTestId('start-game')).toHaveCount(0)
      await expect(p.getByTestId('host-settings')).toHaveCount(0)
      await expect(p.getByTestId('kick-seat')).toHaveCount(0)
      await expect(p.getByText('Waiting for the host to start the game')).toBeVisible()
    }
    await expect(host.getByTestId('start-game')).toBeVisible()
    await expect(host.getByTestId('host-settings')).toBeVisible()
  })

  test('lobby: shared screen shows code and QR for a non-member viewer', async ({ make }) => {
    const host = await make('host'), v = await make('v', { viewport: { width: 1280, height: 720 } })
    const code = await createRoom(host, 'teams')
    await v.goto(`/screen/${code}`)
    await expect(v.getByLabel(`Room code ${code}`)).toBeVisible()
    await expect(v.getByTestId('qr-join')).toBeVisible()
    await expect(v.getByRole('heading', { name: 'Join at your phone' })).toBeVisible()
    await shot(v, 'screen-lobby-1280')
    // a seat claimed later appears on the screen
    const a = await make('a')
    await joinAndClaim(a, code, { name: 'Red', members: ['Ann'] })
    await expect(v.getByRole('list', { name: 'Players' }).getByText('Red')).toBeVisible({ timeout: 8000 })
  })

  test('lobby: every button reachable by keyboard', async ({ make }) => {
    const host = await make('host')
    await createRoom(host, 'teams')
    const reached = new Set<number>()
    for (let i = 0; i < 60; i++) {
      await host.keyboard.press('Tab')
      const idx = await host.evaluate(() => [...document.querySelectorAll('button')].indexOf(document.activeElement as HTMLButtonElement))
      if (idx >= 0) reached.add(idx)
    }
    const unreachable = await host.evaluate((r) => [...document.querySelectorAll('button')]
      .map((b, i) => ({ b, i })).filter(({ b, i }) => !(b as HTMLButtonElement).disabled && b.tabIndex >= 0 && b.getClientRects().length > 0 && !r.includes(i))
      .map(({ b }) => b.getAttribute('aria-label') ?? b.textContent), [...reached])
    expect(unreachable).toEqual([])
  })
})
