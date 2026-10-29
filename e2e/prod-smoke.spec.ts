import { expect, test as base, type Page } from '@playwright/test'

// Short smoke against the deployed app: create a room, join from a second context, claim a seat, see it appear.
base('production smoke: create room, join in a second context, claim a seat', async ({ browser, baseURL }) => {
  const mk = async () => { const c = await browser.newContext({ baseURL, viewport: { width: 420, height: 860 } }); return { c, p: await c.newPage() as Page } }
  const host = await mk(), guest = await mk()
  try {
    await host.p.goto('/')
    await host.p.getByTestId('create-free').click()
    await expect(host.p).toHaveURL(/\/r\/[A-Z]{4}$/)
    const code = new URL(host.p.url()).pathname.split('/').pop()!
    await expect(host.p.getByTestId('room-code')).toBeVisible()
    await guest.p.goto('/')
    await guest.p.getByTestId('join-code').fill(code.toLowerCase())
    await guest.p.getByTestId('join-btn').click()
    await expect(guest.p).toHaveURL(new RegExp(`/r/${code}$`))
    await guest.p.getByTestId('seat-name').fill('Smoke')
    await guest.p.getByTestId('claim-seat').click()
    await expect(guest.p.getByTestId('seat-row').filter({ hasText: 'Smoke' })).toBeVisible()
    await expect(host.p.getByTestId('seat-row').filter({ hasText: 'Smoke' })).toBeVisible({ timeout: 10_000 })
  } finally { await host.c.close(); await guest.c.close() }
})
