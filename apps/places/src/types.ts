import type { components } from 'shared/mimir'

/**
 * The shapes that Mimir, in asgard, sends and takes. `pnpm --filter shared
 * openapi` generates them from its spec, so the app and the service cannot
 * disagree about a place.
 */
type Schemas = components['schemas']

/** What a place is: the buckets the map paints by and the filter picks from. */
export type PlaceCategory = Schemas['PlaceCategory']

/** One place, as Mimir stores it and as the map draws it. */
export type Place = Schemas['Place']

/** A place as it arrives from the form, before Mimir gives it an identity. */
export type PlaceDraft = Schemas['PlaceDraft']

/** One visit to a place, as Mimir stores it. A place holds its visits newest first. */
export type Visit = Schemas['Visit']

/** A visit as the form sends it. A new visit has no id, and Mimir gives it one. */
export type VisitDraft = Schemas['VisitDraft']

/**
 * A hue both palettes carry, so one category color drives the map dot, the
 * filter swatch, and the badge alike.
 *
 * The map draws from the chart module's slots and Badge from the extended `iro`
 * palette. The two overlap on everything but `orange`, so a category picks from
 * the overlap rather than either side forking its palette — which is the one
 * thing the CVD-validated set must never do.
 */
export type PlaceColor = 'blue' | 'violet' | 'green' | 'rose' | 'amber' | 'sky' | 'red' | 'zinc'

/**
 * The atlases, which are both the grains the map draws and the scopes a
 * designation is held under. One list, because they are one thing: an atlas
 * divides the world one way, and a region is marked visited under the atlas that
 * named it.
 *
 * The scopes are kept apart from each other because the names collide: Georgia
 * is a state of the United States and Georgia is a country.
 *
 * Declared as a tuple so the runtime guard at the route and the type below have
 * one source — a scope added here reaches both, where two hand-written lists
 * would leave the route rejecting what the type admits.
 */
export const VISIT_SCOPES = ['states', 'countries'] as const

/** One atlas: the grain the map draws, and the scope its regions are marked under. */
export type VisitScope = (typeof VISIT_SCOPES)[number]

/** Every visited region, by the name its own atlas gives it. */
export type Visits = Schemas['Visits']

/** One category's presentation: the name the reader reads, and the color its dots take. */
export type PlaceCategoryMeta = {
	value: PlaceCategory
	label: string
	color: PlaceColor
}
