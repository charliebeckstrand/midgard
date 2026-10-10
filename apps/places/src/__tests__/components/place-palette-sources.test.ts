import type { ContextMenuItem } from 'ui/context-menu'
import { describe, expect, it, vi } from 'vitest'
import {
	actionSource,
	placeSource,
	regionSource,
	tripSource,
} from '../../components/place-palette/place-palette-sources'
import { matchCommands } from '../../utilities/places-palette'
import { UNITED_STATES } from '../../utilities/places-view'
import { place, trip } from '../fixtures'

/** Menu actions that do nothing, for the cases that are not about the menu. */
const NO_ACTIONS = { onAddVisit: () => {}, onEdit: () => {}, onDelete: () => {} }

describe('placeSource', () => {
	const places = [
		place('old', {
			name: 'Multnomah Falls',
			category: 'nature',
			city: 'Bridal Veil',
			state: 'Oregon',
			createdAt: '2026-01-01T00:00:00.000Z',
		}),
		place('new', {
			name: 'Ichiran Shibuya',
			city: 'Tokyo',
			country: 'Japan',
			createdAt: '2026-09-01T00:00:00.000Z',
		}),
	]

	it('holds the places newest first, and shows them for an empty query', () => {
		const source = placeSource(places, () => {}, NO_ACTIONS)

		expect(matchCommands(source, '').map((command) => command.id)).toEqual(['new', 'old'])
	})

	it('describes a place by its city and its state or country', () => {
		const [tokyo, falls] = placeSource(places, () => {}, NO_ACTIONS).commands

		expect(tokyo?.description).toBe('Tokyo, Japan')

		expect(falls?.description).toBe('Bridal Veil, Oregon')
	})

	it('matches the place and category text, and opens the place on a pick', () => {
		const openPlace = vi.fn()

		const source = placeSource(places, openPlace, NO_ACTIONS)

		expect(matchCommands(source, 'nature').map((command) => command.id)).toEqual(['old'])

		expect(matchCommands(source, 'japan').map((command) => command.id)).toEqual(['new'])

		matchCommands(source, 'ichiran')[0]?.run()

		expect(openPlace).toHaveBeenCalledWith(places[1])
	})

	it('gives each place the rows of the place menu', () => {
		const actions = { onAddVisit: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() }

		const [tokyo] = placeSource(places, () => {}, actions).commands

		const items = (tokyo?.menu ?? []).filter(
			(entry): entry is ContextMenuItem => 'onAction' in entry,
		)

		expect(items.map((item) => item.label)).toEqual(['Add visit', 'Edit place', 'Delete place'])

		for (const item of items) item.onAction?.()

		expect(actions.onAddVisit).toHaveBeenCalledWith(places[1])

		expect(actions.onEdit).toHaveBeenCalledWith(places[1])

		expect(actions.onDelete).toHaveBeenCalledWith(places[1])
	})
})

describe('tripSource', () => {
	const trips = [
		trip('spring', { name: 'Lisbon', city: 'Lisbon', startsOn: '2026-04-01' }),
		trip('fall', { name: 'Kyoto', city: 'Kyoto', country: 'Japan', startsOn: '2026-10-01' }),
	]

	const actions = { onAddPlace: vi.fn(), onEditTrip: vi.fn(), onDeleteTrip: vi.fn() }

	it('holds the trips newest first, and opens a trip on a pick', () => {
		const openTrip = vi.fn()

		const source = tripSource(trips, openTrip, actions)

		expect(matchCommands(source, '').map((command) => command.id)).toEqual(['fall', 'spring'])

		expect(matchCommands(source, 'kyoto')[0]?.description).toBe('Kyoto, Japan')

		matchCommands(source, 'lisbon')[0]?.run()

		expect(openTrip).toHaveBeenCalledWith(trips[0])
	})

	it('gives each trip the rows of the trip menu', () => {
		const [kyoto] = tripSource(trips, () => {}, actions).commands

		const items = (kyoto?.menu ?? []).filter(
			(entry): entry is ContextMenuItem => 'onAction' in entry,
		)

		expect(items.map((item) => item.label)).toEqual(['Add place', 'Edit trip', 'Delete trip'])
	})
})

describe('regionSource', () => {
	const goTo = vi.fn()

	const preload = vi.fn()

	const source = regionSource({
		countries: ['Georgia', 'Japan'],
		states: ['Georgia', 'Oregon'],
		countryPlaces: new Map([['Japan', [place('a'), place('b')]]]),
		statePlaces: new Map([['Georgia', [place('c')]]]),
		goTo,
		preload,
	})

	it('lists a country and a state of the same name apart, with their counts', () => {
		const georgias = matchCommands(source, 'georgia').map((command) => command.description)

		expect(georgias).toEqual(['Country', 'US state · 1 place'])

		expect(matchCommands(source, 'japan')[0]?.description).toBe('Country · 2 places')
	})

	it('goes to and preloads the view of the region', () => {
		const [country, state] = matchCommands(source, 'georgia')

		country?.run()

		state?.preload?.()

		expect(goTo).toHaveBeenCalledWith({ country: 'Georgia', state: null })

		expect(preload).toHaveBeenCalledWith({ country: UNITED_STATES, state: 'Georgia' })
	})
})

describe('actionSource', () => {
	const base = {
		onAdd: () => {},
		onAddTrip: () => {},
		mark: null,
		marked: false,
		onMark: () => {},
	}

	it('shows every action for an empty query', () => {
		const source = actionSource({
			...base,
			onList: () => {},
			onListTrips: () => {},
			mark: 'Oregon',
		})

		expect(matchCommands(source, '').map((command) => command.label)).toEqual([
			'Add place',
			'My places',
			'Add trip',
			'My trips',
			'Mark Oregon visited',
		])
	})

	it('leaves out each list without its records, and the mark without a region', () => {
		expect(actionSource(base).commands.map((command) => command.id)).toEqual(['add', 'add-trip'])
	})

	it('flips the visited state of the region', () => {
		const onMark = vi.fn()

		const source = actionSource({ ...base, mark: 'Oregon', marked: true, onMark })

		const unmark = source.commands.find((command) => command.id === 'mark')

		expect(unmark?.label).toBe('Unmark Oregon visited')

		unmark?.run()

		expect(onMark).toHaveBeenCalledWith(false)
	})
})
