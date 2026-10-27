import { describe, expect, it, vi } from 'vitest'
import {
	useChartActions,
	useChartMarkEmphasis,
	useChartSeriesEmphasis,
	useChartTier,
} from '../../modules/chart/engine/context'
import { useDashboardTileRankScope, useDashboardTitleLevel } from '../../modules/dashboard/context'
import { renderUI } from '../helpers'

// The frame and the board provide these contexts to each reader. A reader with no
// provider is a wrong mount, so it throws and does not draw with a stand-in value.
const READERS = [
	['useChartMarkEmphasis', useChartMarkEmphasis, 'ChartMarkEmphasis'],
	['useChartActions', useChartActions, 'ChartActions'],
	['useChartSeriesEmphasis', useChartSeriesEmphasis, 'ChartSeriesEmphasis'],
	['useChartTier', useChartTier, 'ChartTier'],
	['useDashboardTitleLevel', useDashboardTitleLevel, 'Dashboard'],
	['useDashboardTileRankScope', useDashboardTileRankScope, 'DashboardTileRank'],
] as const

describe('required chart and dashboard contexts', () => {
	it.each(READERS)('%s throws with no provider', (_, read, name) => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		function Reader() {
			read()

			return null
		}

		expect(() => renderUI(<Reader />)).toThrow(`must be used within <${name}>`)
	})
})
