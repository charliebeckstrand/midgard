import { vi } from 'vitest'

/**
 * Stubs the gateway: `fetch` resolves to the given status and body. The config
 * restores the global after each test.
 */
export function stubGateway(status: number, body: unknown = null) {
	const fetch = vi.fn(async (_request: Request) => Response.json(body, { status }))

	vi.stubGlobal('fetch', fetch)

	return fetch
}
