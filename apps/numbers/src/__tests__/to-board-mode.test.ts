import { describe, expect, it, vi } from 'vitest'

vi.mock('shared/mimir', () => ({ createMimirClient: () => ({}) }))

import { toBoardMode } from '../api/leaderboard-api'

const TODAY = '20261116'

describe('toBoardMode', () => {
	it.each([
		[{ seed: TODAY, mode: 'solo' }, 'daily'],
		[{ seed: 'k3x9q2', mode: 'solo' }, 'solo'],
		[{ seed: '20261115', mode: 'solo' }, 'solo'],
		[{ seed: 'k3x9q2', mode: 'vsCpu' }, 'vsCpu'],
		[{ seed: TODAY, mode: 'vsCpu' }, 'vsCpu'],
	] as const)('puts %j on the %s board', (run, board) => {
		expect(toBoardMode({ ...run, score: 10, today: TODAY })).toBe(board)
	})
})
