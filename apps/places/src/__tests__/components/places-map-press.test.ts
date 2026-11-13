// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { createElement as h, type ReactNode } from 'react'
import type { ChartPress } from 'ui/chart'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlacesMap, type PlacesMapProps } from '../../components/places-map/places-map'
import { WORLD } from '../../utilities/places-view'
import { place } from '../fixtures'

/** The handlers that the map gave to the two marks at the last render. */
const handlers: {
	region?: (region: string, index: number, press: ChartPress) => void
	point?: (id: string, index: number, merged: number[], press: ChartPress) => void
} = {}

// The marks keep the handlers that the map gives them and draw nothing. The
// engine sends each press to these handlers, and `ui` tests how it does that.
vi.mock('ui/modules/map', async (original) => ({
	...(await original<typeof import('ui/modules/map')>()),
	MapPlat: (props: { onRegionClick: typeof handlers.region; children: ReactNode }) => {
		handlers.region = props.onRegionClick

		return props.children
	},
	MapPoints: (props: { onClick: typeof handlers.point }) => {
		handlers.point = props.onClick

		return null
	},
}))

afterEach(cleanup)

const TAP: ChartPress = { pointerType: 'touch', count: 1 }

const DOUBLE_TAP: ChartPress = { pointerType: 'touch', count: 2 }

const CLICK: ChartPress = { pointerType: 'mouse', count: 1 }

function renderMap() {
	const onDrill = vi.fn<PlacesMapProps['onDrill']>()

	const onSelect = vi.fn<PlacesMapProps['onSelect']>()

	const props: PlacesMapProps = {
		regions: { type: 'FeatureCollection', features: [] },
		places: [place('a')],
		trips: [],
		view: WORLD,
		visited: new Set(),
		visitedRegions: undefined,
		onDrill,
		selected: { places: [], trips: [] },
		onSelect,
	}

	render(h(PlacesMap, props))

	// Without the handlers, a case that expects no call asserts nothing.
	expect(handlers.region).toBeTypeOf('function')

	expect(handlers.point).toBeTypeOf('function')

	return { onDrill, onSelect }
}

// On a phone, one tap opens a point, and a region drills only on a double tap.
describe('PlacesMap presses', () => {
	it('opens a point on one tap', () => {
		const { onSelect } = renderMap()

		handlers.point?.('records', 0, [0], TAP)

		expect(onSelect).toHaveBeenCalledWith({ places: ['a'], trips: [] })
	})

	it('does not drill into a region on one tap', () => {
		const { onDrill } = renderMap()

		handlers.region?.('Oregon', 0, TAP)

		expect(onDrill).not.toHaveBeenCalled()
	})

	it('drills into a region on a double tap and on a click', () => {
		const { onDrill } = renderMap()

		handlers.region?.('Oregon', 0, DOUBLE_TAP)

		handlers.region?.('Ohio', 1, CLICK)

		expect(onDrill.mock.calls).toEqual([['Oregon'], ['Ohio']])
	})
})
