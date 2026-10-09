import { MutationObserver, type MutationOptions } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestError } from '../auth/bifrost'
import { createAppQueryClient, latestError } from '../providers/query-client'

afterEach(() => {
	vi.unstubAllGlobals()
})

// Builds the client of an app, with a spy for the toasts and a spy for the page location.
function setup() {
	const toast = vi.fn(() => 'id')

	const assign = vi.fn()

	vi.stubGlobal('window', { location: { assign } })

	const client = createAppQueryClient({ toast })

	// Runs one mutation to its end, and keeps its failure off the test.
	const run = (options: MutationOptions<unknown, Error, void>) =>
		new MutationObserver(client, options).mutate().catch(() => undefined)

	return { client, toast, assign, run }
}

describe('createAppQueryClient', () => {
	it('shows the error of a failed mutation in a toast', async () => {
		const { toast, assign, run } = setup()

		await run({
			mutationFn: () => Promise.reject(new RequestError('The week has kicked off', 409)),
		})

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ severity: 'error', description: 'The week has kicked off' }),
		)

		expect(assign).not.toHaveBeenCalled()
	})

	it('shows a failure that has no status, such as an offline request', async () => {
		const { toast, run } = setup()

		await run({ mutationFn: () => Promise.reject(new TypeError('Failed to fetch')) })

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ severity: 'error', description: 'Failed to fetch' }),
		)
	})

	it('shows no toast for a mutation whose page shows the error in place', async () => {
		const { toast, run } = setup()

		await run({
			mutationFn: () => Promise.reject(new RequestError('Sign in again', 403)),
			meta: { inlineError: true },
		})

		expect(toast).not.toHaveBeenCalled()
	})

	it('sends an ended session to the sign-in page from a mutation, with no toast', async () => {
		const { toast, assign, run } = setup()

		await run({ mutationFn: () => Promise.reject(new RequestError('Not authenticated', 401)) })

		expect(assign).toHaveBeenCalledWith('/login')

		expect(toast).not.toHaveBeenCalled()
	})

	it('sends an ended session to the sign-in page from a mutation that shows its error in place', async () => {
		const { assign, run } = setup()

		await run({
			mutationFn: () => Promise.reject(new RequestError('Not authenticated', 401)),
			meta: { inlineError: true },
		})

		expect(assign).toHaveBeenCalledWith('/login')
	})

	it('sends an ended session to the sign-in page from a query', async () => {
		const { client, toast, assign } = setup()

		await client
			.fetchQuery({
				queryKey: ['x'],
				queryFn: () => Promise.reject(new RequestError('Not authenticated', 401)),
				retry: false,
			})
			.catch(() => undefined)

		expect(assign).toHaveBeenCalledWith('/login')

		expect(toast).not.toHaveBeenCalled()
	})

	it('leaves a failed query to the page that reads it', async () => {
		const { client, toast, assign } = setup()

		await client
			.fetchQuery({
				queryKey: ['x'],
				queryFn: () => Promise.reject(new RequestError('Unavailable', 503)),
				retry: false,
			})
			.catch(() => undefined)

		expect(assign).not.toHaveBeenCalled()

		expect(toast).not.toHaveBeenCalled()
	})
})

describe('latestError', () => {
	const failed = (message: string, submittedAt: number) => ({
		error: new Error(message),
		submittedAt,
	})

	const idle = { error: null, submittedAt: 0 }

	it('is null when no mutation ran', () => {
		expect(latestError(idle, idle)).toBeNull()
	})

	it('is the error of the mutation that ran last', () => {
		expect(latestError(failed('first', 1), failed('second', 2))?.message).toBe('second')
	})

	it('clears when a later mutation succeeds', () => {
		expect(latestError(failed('old', 1), { error: null, submittedAt: 2 })).toBeNull()
	})

	it('keeps an error that is later than an idle mutation', () => {
		expect(latestError(idle, failed('only', 5))?.message).toBe('only')
	})
})
