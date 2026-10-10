import { describe, expect, it, vi } from 'vitest'
import { drawerItem, drawerList, trailSteps } from '../../components/summary-drawer'
import type { Place } from '../../types'
import { PANEL_START, type PlacePanelStep } from '../../utilities/places-url'
import { place } from '../fixtures'

const a = place('a')

const b = place('b')

const c = place('c')

/** Every place of the region that the trail ends on. */
const region: readonly Place[] = [a, b, c]

/** What the panel shows for a picked group on one step. */
function shows(group: readonly Place[], step: PlacePanelStep) {
	const { list, group: name } = drawerList(group, region, step.widened)

	return { list, name, place: drawerItem(group, list, step) }
}

/** The steps that the crumbs of a panel move to, by label. */
function crumbs(group: readonly Place[], step: PlacePanelStep) {
	const { list, name, place: open } = shows(group, step)

	const onStepChange = vi.fn<(step: PlacePanelStep) => void>()

	const steps = trailSteps({
		where: ['United States', 'Oregon'],
		group: name,
		item: open,
		hasList: list.length > 0,
		onNavigate: vi.fn(),
		onStepChange,
	})

	return Object.fromEntries(
		steps.map((crumb) => {
			if (crumb.onPick === undefined) return [crumb.label, null]

			crumb.onPick()

			return [crumb.label, onStepChange.mock.lastCall?.[0] ?? null]
		}),
	)
}

describe('drawerPlace', () => {
	// A reload reads the step back from the address, so the panel paints on the
	// place the reader went into and not on the list it was opened from.
	it('shows the place of a group that the step opened', () => {
		expect(shows([a, b], { opened: 'b', widened: false })).toMatchObject({
			name: '2 nearby',
			place: b,
		})
	})

	it('shows the list of a group on its start step', () => {
		expect(shows([a, b], PANEL_START).place).toBeNull()
	})

	it('shows a lone place on its start step', () => {
		expect(shows([a], PANEL_START).place).toBe(a)
	})

	// The second case of the report: a lone place, then the region crumb. A
	// reload must open on the region's list and not on the place again.
	it('shows the region list of a lone place that the step widened', () => {
		expect(shows([a], { opened: null, widened: true })).toEqual({
			list: region,
			name: null,
			place: null,
		})
	})

	it('falls back to the list for an opened id that the list does not hold', () => {
		expect(shows([a, b], { opened: 'gone', widened: false }).place).toBeNull()
	})
})

describe('trailSteps', () => {
	it('moves a group with an open place back to the group or out to the region', () => {
		expect(crumbs([a, b], { opened: 'b', widened: false })).toEqual({
			'United States': null,
			Oregon: { opened: null, widened: true },
			'2 nearby': { opened: null, widened: false },
			b: null,
		})
	})

	it('moves a lone place out to the region list', () => {
		expect(crumbs([a], PANEL_START)).toEqual({
			'United States': null,
			Oregon: { opened: null, widened: true },
			a: null,
		})
	})

	it('leaves the crumb of the list that the panel already shows inert', () => {
		expect(crumbs([a], { opened: null, widened: true }).Oregon).toBeNull()
	})
})
