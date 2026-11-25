import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type Ban,
	resolveThreat,
	type Threat,
} from '../../app/(signed-in)/(dashboard)/security/security-api'
import {
	securityKeys,
	useRemoveBan,
	useResolveThreat,
} from '../../app/(signed-in)/(dashboard)/security/security-queries'

vi.mock('../../app/(signed-in)/(dashboard)/security/security-api', () => ({
	resolveThreat: vi.fn(),
	removeBan: vi.fn(async () => undefined),
}))

function threat(id: string, resolved = false): Threat {
	return {
		id,
		threat_type: 'brute_force',
		severity: 'high',
		ip: '192.0.2.1',
		details: {},
		action_taken: null,
		resolved,
		created_at: '2026-11-01T00:00:00.000Z',
	}
}

function ban(ip: string): Ban {
	return {
		id: `ban-${ip}`,
		ip,
		reason: 'brute force',
		rule_id: null,
		created_by: 'system',
		expires_at: null,
		created_at: '2026-11-01T00:00:00.000Z',
	}
}

/** A client and the hook rendered on it. */
function setup<T>(hook: () => T) {
	const client = new QueryClient()

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)

	const { result } = renderHook(hook, { wrapper })

	return { client, result }
}

describe('useResolveThreat', () => {
	it('puts the answer in place of that threat, and keeps the others', async () => {
		vi.mocked(resolveThreat).mockResolvedValue(threat('t2', true))

		const { client, result } = setup(() => useResolveThreat())

		const held = [threat('t1'), threat('t2'), threat('t3')]

		client.setQueryData(securityKeys.threats, held)

		await act(() => result.current.mutateAsync({ id: 't2', resolved: true }))

		const cached = client.getQueryData<Threat[]>(securityKeys.threats)

		expect(cached?.map((kept) => [kept.id, kept.resolved])).toEqual([
			['t1', false],
			['t2', true],
			['t3', false],
		])

		expect(cached?.[0]).toBe(held[0])
	})
})

describe('useRemoveBan', () => {
	it('removes only the ban on that address from the cached list', async () => {
		const { client, result } = setup(() => useRemoveBan())

		client.setQueryData(securityKeys.bans, [ban('192.0.2.1'), ban('192.0.2.2')])

		await act(() => result.current.mutateAsync('192.0.2.1'))

		expect(client.getQueryData(securityKeys.bans)).toEqual([ban('192.0.2.2')])
	})
})
