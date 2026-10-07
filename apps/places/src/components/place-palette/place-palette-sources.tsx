import { Globe, MapIcon, MapPin, MapPinCheck, MapPinned, Plus } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Swatch } from 'ui/swatch'
import { CATEGORY_BY_VALUE, categoryLabel } from '../../constants'
import type { Place } from '../../types'
import type { PaletteCommand, PaletteSource } from '../../utilities/places-palette'
import { type PlaceView, UNITED_STATES } from '../../utilities/places-view'
// The rows alone, not the barrel: the barrel also holds `PlaceMenu`, and the
// bundle then keeps the menu code of ui on the home page.
import { type PlaceActions, placeMenuItems } from '../place-menu/place-menu-items'

/** How many of the newest places show for an empty query. */
const RECENT_PLACES = 5

/** The text after a region name: its kind, and how many places it holds. */
function regionDescription(kind: string, count: number): string {
	if (count === 0) return kind

	return `${kind} · ${count} ${count === 1 ? 'place' : 'places'}`
}

/** Where a place is, as its row shows it: the city and the state or the country. */
function placeDescription(place: Place): string {
	const where = [place.city, place.state ?? place.country].filter(Boolean).join(', ')

	return where === '' ? place.address : where
}

/**
 * The source of the stored places. An empty query shows the newest places, so
 * the source holds them newest first.
 *
 * The row mark is a swatch in the category color, which is the color of the
 * dot on the map. A right-click or a long press on a row opens the menu of the
 * place, with the rows that its menu has everywhere else.
 */
export function placeSource(
	places: readonly Place[],
	openPlace: (place: Place) => void,
	actions: PlaceActions,
): PaletteSource {
	const newest = [...places].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

	return {
		heading: 'Places',
		idle: RECENT_PLACES,
		commands: newest.map(
			(place): PaletteCommand => ({
				id: place.id,
				label: place.name,
				description: placeDescription(place),
				icon: (
					<Swatch
						shape="circle"
						color={CATEGORY_BY_VALUE.get(place.category)?.color}
						className="mx-1"
					/>
				),
				keywords: [
					place.city,
					place.state,
					place.country,
					place.address,
					categoryLabel(place.category),
				].join(' '),
				run: () => openPlace(place),
				menu: placeMenuItems(place, actions),
			}),
		),
	}
}

/** Props of {@link regionSource}. */
export type RegionSourceInput = {
	/** The names of the countries atlas. */
	countries: readonly string[]
	/** The names of the states atlas. */
	states: readonly string[]
	/** The places of each country, by its atlas name. */
	countryPlaces: ReadonlyMap<string, readonly Place[]>
	/** The places of each state, by its atlas name. */
	statePlaces: ReadonlyMap<string, readonly Place[]>
	goTo: (view: PlaceView) => void
	preload: (view: PlaceView) => void
}

/**
 * The source of the regions: each country and each US state, also a region
 * that holds no places. The rows are in name order.
 *
 * A country and a state can have the same name, for example Georgia. The mark
 * and the description tell them apart.
 */
export function regionSource({
	countries,
	states,
	countryPlaces,
	statePlaces,
	goTo,
	preload,
}: RegionSourceInput): PaletteSource {
	const region = (
		id: string,
		label: string,
		description: string,
		icon: PaletteCommand['icon'],
		view: PlaceView,
	): PaletteCommand => ({
		id,
		label,
		description,
		icon,
		run: () => goTo(view),
		preload: () => preload(view),
	})

	const commands = [
		...countries.map((name) =>
			region(
				`country:${name}`,
				name,
				regionDescription('Country', countryPlaces.get(name)?.length ?? 0),
				<Icon icon={<Globe />} />,
				{ country: name, state: null },
			),
		),
		...states.map((name) =>
			region(
				`state:${name}`,
				name,
				regionDescription('US state', statePlaces.get(name)?.length ?? 0),
				<Icon icon={<MapIcon />} />,
				{ country: UNITED_STATES, state: name },
			),
		),
	].sort((a, b) => a.label.localeCompare(b.label))

	return { heading: 'Go to', commands }
}

/** Props of {@link actionSource}. */
export type ActionSourceInput = {
	onAdd: () => void
	/** Opens the list. Without it, the source has no list action. */
	onList?: () => void
	/** The region that the visited action marks, or `null` where there is none. */
	mark: string | null
	marked: boolean
	onMark: (visited: boolean) => void
}

/**
 * The source of the actions. An empty query shows all of them. They are the
 * actions of the user menu and of the visited toggle, with the same rules.
 */
export function actionSource({
	onAdd,
	onList,
	mark,
	marked,
	onMark,
}: ActionSourceInput): PaletteSource {
	const commands: PaletteCommand[] = [
		{
			id: 'add',
			label: 'Add place',
			icon: <Icon icon={<Plus />} />,
			keywords: 'new create',
			run: onAdd,
		},
	]

	if (onList !== undefined) {
		commands.push({
			id: 'list',
			label: 'My places',
			icon: <Icon icon={<MapPinned />} />,
			keywords: 'list index',
			run: onList,
		})
	}

	if (mark !== null) {
		commands.push({
			id: 'mark',
			label: marked ? `Unmark ${mark} visited` : `Mark ${mark} visited`,
			icon: <Icon icon={marked ? <MapPin /> : <MapPinCheck />} />,
			keywords: 'visited',
			run: () => onMark(!marked),
		})
	}

	return { heading: 'Actions', idle: commands.length, commands }
}
