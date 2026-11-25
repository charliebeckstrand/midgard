import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	addPasskey,
	type Factors,
	type Identity,
	type Passkey,
} from '../../app/(signed-in)/account/account-api'
import {
	accountKeys,
	useAddPasskey,
	useRemovePasskey,
	useUnlinkIdentity,
} from '../../app/(signed-in)/account/account-queries'

vi.mock('../../app/(signed-in)/account/account-api', () => ({
	addPasskey: vi.fn(),
	removePasskey: vi.fn(async () => undefined),
	unlinkIdentity: vi.fn(async () => undefined),
}))

const factors: Factors = { enabled: true, passkeys: 2, totp: false, recovery_codes: 0 }

function passkey(id: string): Passkey {
	return { id, created_at: '2026-11-01T00:00:00.000Z' }
}

function identity(provider: Identity['provider']): Identity {
	return { provider, email: `me@${provider}.test`, created_at: '2026-11-01T00:00:00.000Z' }
}

/** A client with the factors in the cache, and the hook rendered on it. */
function setup<T>(hook: () => T) {
	const client = new QueryClient()

	client.setQueryData(accountKeys.factors, factors)

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)

	const { result } = renderHook(hook, { wrapper })

	return { client, result }
}

describe('useAddPasskey', () => {
	it('adds the new passkey to the end of the cached list, and marks the factors stale', async () => {
		vi.mocked(addPasskey).mockResolvedValue(passkey('p2'))

		const { client, result } = setup(() => useAddPasskey())

		client.setQueryData(accountKeys.passkeys, [passkey('p1')])

		await act(() => result.current.mutateAsync())

		expect(client.getQueryData(accountKeys.passkeys)).toEqual([passkey('p1'), passkey('p2')])

		expect(client.getQueryState(accountKeys.factors)?.isInvalidated).toBe(true)
	})

	it('starts the list when the cache holds no passkeys', async () => {
		vi.mocked(addPasskey).mockResolvedValue(passkey('p1'))

		const { client, result } = setup(() => useAddPasskey())

		await act(() => result.current.mutateAsync())

		expect(client.getQueryData(accountKeys.passkeys)).toEqual([passkey('p1')])
	})
})

describe('useRemovePasskey', () => {
	it('removes only that passkey from the cached list, and marks the factors stale', async () => {
		const { client, result } = setup(() => useRemovePasskey())

		client.setQueryData(accountKeys.passkeys, [passkey('p1'), passkey('p2'), passkey('p3')])

		await act(() => result.current.mutateAsync('p2'))

		expect(client.getQueryData(accountKeys.passkeys)).toEqual([passkey('p1'), passkey('p3')])

		expect(client.getQueryState(accountKeys.factors)?.isInvalidated).toBe(true)
	})
})

describe('useUnlinkIdentity', () => {
	it('removes only that provider from the cached list, and leaves the factors', async () => {
		const { client, result } = setup(() => useUnlinkIdentity())

		client.setQueryData(accountKeys.identities, [identity('github'), identity('google')])

		await act(() => result.current.mutateAsync('github'))

		expect(client.getQueryData(accountKeys.identities)).toEqual([identity('google')])

		expect(client.getQueryState(accountKeys.factors)?.isInvalidated).toBe(false)
	})
})
