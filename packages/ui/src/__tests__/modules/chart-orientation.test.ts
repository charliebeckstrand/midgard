// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	bandExtent,
	type ChartOrientation,
	project,
	valueRule,
} from '../../modules/chart/engine/chart-orientation'

const PLOT = { x: 40, y: 8, width: 320, height: 180 }

describe('valueRule', () => {
	it.each<ChartOrientation>(['vertical', 'horizontal'])(
		'puts the %s rule at each end of the band extent',
		(orientation) => {
			const [start, end] = bandExtent(orientation, PLOT)

			// A value rule is the value projected at each end of the band axis.
			expect(valueRule(orientation, PLOT, 72.5)).toEqual({
				from: project(orientation, 72.5, start),
				to: project(orientation, 72.5, end),
			})
		},
	)

	it('runs across x when vertical and down y when horizontal', () => {
		expect(valueRule('vertical', PLOT, 100)).toEqual({
			from: { x: 40, y: 100 },
			to: { x: 360, y: 100 },
		})

		expect(valueRule('horizontal', PLOT, 100)).toEqual({
			from: { x: 100, y: 8 },
			to: { x: 100, y: 188 },
		})
	})
})
