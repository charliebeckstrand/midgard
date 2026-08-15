/** What a place is: the buckets the map paints by and the filter picks from. */
export type PlaceCategory = 'food' | 'entertainment' | 'nature' | 'shopping' | 'other'

/** One place, as it is stored and as the map draws it. */
export type Place = {
	id: string
	/** The business or place name, which is what the reader searched for. */
	name: string
	category: PlaceCategory
	/** The address on one line, for the details panel. */
	address: string
	city?: string
	/**
	 * The state the geocoder named. The drawn geometry decides which state holds a
	 * place; this answers where the geometry cannot, which on a generalized atlas
	 * is every coastal place that sits just outside the outline. It is also what
	 * the state filter reads, so that filter works outside the drawn atlas too.
	 */
	state?: string
	/** The country the geocoder named, which the country filter reads. */
	country?: string
	latitude: number
	longitude: number
	/** 1–5, or 0 for a place added without one. */
	rating: number
	review?: string
	url?: string
	/** A picture of the place, as a web address the reader supplies. */
	photo?: string
	/** The day of the visit, `YYYY-MM-DD`, which the date filter reads. */
	visitedAt: string
	/** When the record was written, ISO. */
	createdAt: string
}

/** A place as it arrives from the form, before the store gives it an identity. */
export type PlaceDraft = Omit<Place, 'id' | 'createdAt'>

/**
 * A hue both palettes carry, so one category colour drives the map dot, the
 * filter swatch, and the badge alike.
 *
 * The map draws from the chart module's slots and Badge from the extended `iro`
 * palette. The two overlap on everything but `orange`, so a category picks from
 * the overlap rather than either side forking its palette — which is the one
 * thing the CVD-validated set must never do.
 */
export type PlaceColor = 'blue' | 'violet' | 'green' | 'rose' | 'amber' | 'sky' | 'red' | 'zinc'

/**
 * Which atlas a designation belongs to. The two are kept apart because the names
 * collide: Georgia is a state of the United States and Georgia is a country.
 */
export type VisitScope = 'states' | 'countries'

/** Every visited region, by the name its own atlas gives it. */
export type Visits = Record<VisitScope, string[]>

/** One category's presentation: the name the reader reads, and the colour its dots take. */
export type PlaceCategoryMeta = {
	value: PlaceCategory
	label: string
	color: PlaceColor
}
