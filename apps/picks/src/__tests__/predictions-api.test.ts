import { afterEach, describe, expect, it, vi } from 'vitest'
import { deletePicks, listPicks, savePicks } from '../api/predictions-api'

// A browser resolves a same-origin path, and the `Request` of Node takes only an absolute URL.
vi.hoisted(() => {
	globalThis.Request = class extends Request {
		constructor(input: RequestInfo | URL, init?: RequestInit) {
			super(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
		}
	}
})

// Stubs the gateway with one answer, and the page location with a spy.
function stub(response: Response) {
	const assign = vi.fn()

	vi.stubGlobal(
		'fetch',
		vi.fn(async () => response),
	)
	vi.stubGlobal('window', { location: { assign } })

	return assign
}

function json(body: unknown, status: number) {
	return Response.json(body, { status })
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('predictions api', () => {
	it('throws an ended session with its status, for the query client to send to the sign-in page', async () => {
		const assign = stub(json({ error: 'unauthorized', message: 'Not signed in' }, 401))

		await expect(listPicks(2026)).rejects.toMatchObject({ message: 'Not signed in', status: 401 })

		expect(assign).not.toHaveBeenCalled()
	})

	it('throws the message of the service and stays on the page', async () => {
		const assign = stub(json({ error: 'conflict', message: 'The week has kicked off' }, 409))

		await expect(deletePicks(2026, 5)).rejects.toThrow('The week has kicked off')

		expect(assign).not.toHaveBeenCalled()
	})

	it('answers with the stored picks', async () => {
		const stored = { g1: { team: 'KC', line: -3.5 } }

		stub(json(stored, 200))

		await expect(savePicks(2026, 5, { g1: 'KC' })).resolves.toEqual(stored)
	})

	it('answers a delete with nothing', async () => {
		stub(new Response(null, { status: 204 }))

		await expect(deletePicks(2026, 5)).resolves.toBeUndefined()
	})
})
