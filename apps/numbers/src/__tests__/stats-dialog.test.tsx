// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModeStats, NumbersStats } from '../api/stats-api'
import { StatsDialog } from '../components/stats-dialog/stats-dialog'

const { useStats } = vi.hoisted(() => ({
	useStats: vi.fn<() => { data: NumbersStats | undefined; isError: boolean }>(),
}))

vi.mock('../queries/stats-queries', () => ({ useStats }))

/** The stats of a mode with `played` runs and the share of wins `winRate`. */
const modeStats = (played: number, winRate: number | null): ModeStats => ({
	played,
	wins: 0,
	best: played ? 12 : null,
	average: played ? 9 : null,
	scores: Array.from({ length: 21 }, () => 0),
	winRate,
})

/** The tile with the label `label`, or null. */
const tile = (label: string) => screen.queryByText(label)?.parentElement ?? null

/** Renders the open dialog for a verified user. */
function renderDialog() {
	return render(
		<UIProvider>
			<StatsDialog
				open
				onOpenChange={() => {}}
				user={{ id: 'user-1', is_verified: true } as User}
			/>
		</UIProvider>,
	)
}

beforeEach(() => {
	// jsdom has no `ResizeObserver`, and the Segment and the dialog watch their parts with one.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

afterEach(() => {
	cleanup()

	vi.unstubAllGlobals()

	vi.resetAllMocks()
})

describe('StatsDialog', () => {
	it('shows Win % on Vs CPU only, as a whole percent', async () => {
		useStats.mockReturnValue({
			data: { solo: modeStats(4, null), vsCpu: modeStats(9, 4 / 9) },
			isError: false,
		})

		renderDialog()

		expect(tile('Played')?.textContent).toContain('4')

		expect(tile('Win %')).toBeNull()

		fireEvent.click(screen.getByRole('tab', { name: 'Vs CPU' }))

		expect((await screen.findByText('Win %')).parentElement?.textContent).toContain('44%')
	})

	it('shows a dash for Win % before the first run with an outcome', async () => {
		useStats.mockReturnValue({
			data: { solo: modeStats(0, null), vsCpu: modeStats(3, null) },
			isError: false,
		})

		renderDialog()

		fireEvent.click(screen.getByRole('tab', { name: 'Vs CPU' }))

		expect((await screen.findByText('Win %')).parentElement?.textContent).toContain('–')
	})
})
