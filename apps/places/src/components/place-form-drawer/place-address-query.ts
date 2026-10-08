/**
 * The queries that a typed address is searched as, in order. The first is the
 * address as the reader typed it. The second is the address without its
 * secondary unit, where it has one.
 *
 * The map data holds no secondary unit. The geocoder does not need each word to
 * match, but each word that does not match lowers the rank of the correct
 * match. "16784 SW Edy Rd Unit 103, Sherwood, OR 97140" finds nothing, and the
 * same address without "Unit 103" finds the house.
 */

/**
 * The words that open a secondary unit. "Fl" and "Floor" are not in the list,
 * because "FL" is also the code of Florida.
 */
const UNIT_WORDS = 'apartment|apt|building|bldg|room|rm|suite|ste|unit'

/**
 * A secondary unit: a unit word and an id, or `#` and an id. The id holds a
 * digit, or is one letter, so that the city "Ste. Genevieve" stays.
 */
const UNIT = new RegExp(
	`(?:\\b(?:${UNIT_WORDS})\\.?\\s*#?\\s*|#\\s*)(?:\\d[\\w-]*|[a-z]\\d*)(?![\\w.])`,
	'gi',
)

/** The address without its secondary unit, and without the parts that the unit leaves empty. */
export function withoutUnit(address: string): string {
	return address
		.replace(UNIT, ' ')
		.split(',')
		.map((part) => part.replace(/\s+/g, ' ').trim())
		.filter((part) => part !== '')
		.join(', ')
}

/**
 * The queries for a typed address, in the order to search them. There is one
 * query where the address has no secondary unit.
 */
export function addressQueries(address: string): string[] {
	const typed = address.trim()

	const bare = withoutUnit(typed)

	return bare === typed || bare === '' ? [typed] : [typed, bare]
}
