/**
 * The queries that a typed address is searched as, in order. The first is the
 * address as the reader typed it. The second is the address in the form that
 * the map data holds, where that form is different.
 *
 * The map data holds no secondary unit, and it holds the US street words in
 * full: "Southwest Edy Road", not "SW Edy Rd". The geocoder does not need each
 * word to match, but each word that does not match lowers the rank of the
 * correct match. "16784 SW Edy Rd Unit 103" holds four such words, and the
 * geocoder then finds nothing.
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

/** The US street types, by the USPS abbreviation. */
const STREET_TYPES: Record<string, string> = {
	aly: 'Alley',
	ave: 'Avenue',
	blvd: 'Boulevard',
	cir: 'Circle',
	ct: 'Court',
	dr: 'Drive',
	expy: 'Expressway',
	fwy: 'Freeway',
	hwy: 'Highway',
	ln: 'Lane',
	pkwy: 'Parkway',
	pl: 'Place',
	rd: 'Road',
	sq: 'Square',
	st: 'Street',
	ter: 'Terrace',
	trl: 'Trail',
}

/** The compass directions, by the USPS abbreviation. */
const DIRECTIONS: Record<string, string> = {
	n: 'North',
	s: 'South',
	e: 'East',
	w: 'West',
	ne: 'Northeast',
	nw: 'Northwest',
	se: 'Southeast',
	sw: 'Southwest',
}

/** The street types in full, in lowercase. */
const FULL_STREET_TYPES = new Set(Object.values(STREET_TYPES).map((type) => type.toLowerCase()))

/** Whether a word is a house number, such as "16784" or "12B". */
function isHouseNumber(word: string): boolean {
	return /^\d+[a-z]?$/i.test(word)
}

/** A word without a period at its end, in lowercase, for a lookup. */
function key(word: string): string {
	return word.replace(/\.$/, '').toLowerCase()
}

/** Whether a word is a street type, in full or abbreviated. */
function isStreetType(word: string): boolean {
	return STREET_TYPES[key(word)] !== undefined || FULL_STREET_TYPES.has(key(word))
}

/**
 * Whether a word is a state code at the end of the address: two capitals,
 * and only a postal code or nothing after it. "CT" and "NE" are then the
 * states, not "Court" and "Northeast".
 */
function isStateCode(words: string[], at: number): boolean {
	const word = words[at] ?? ''

	if (!/^[A-Z]{2}$/.test(word)) return false

	const after = words.slice(at + 1)

	return after.length === 0 || (after.length === 1 && /\d/.test(after[0] ?? ''))
}

/**
 * The street words of one part of the address in full.
 *
 * A direction expands at the start of the street or after the house number
 * ("SW Edy Rd"), and after a street type ("Main St E"). A street type expands
 * after a word that is neither a house number nor a direction. Thus "St"
 * stays in "123 St Charles Ave", where it is "Saint".
 */
function expandStreet(part: string): string {
	const words = part.trim().split(/\s+/)

	return words
		.map((word, at) => {
			if (isStateCode(words, at)) return word

			const before = at === 0 ? undefined : words[at - 1]

			const direction = DIRECTIONS[key(word)]

			if (
				direction !== undefined &&
				(before === undefined || isHouseNumber(before) || isStreetType(before))
			) {
				return direction
			}

			const type = STREET_TYPES[key(word)]

			if (
				type !== undefined &&
				before !== undefined &&
				!isHouseNumber(before) &&
				DIRECTIONS[key(before)] === undefined
			) {
				return type
			}

			return word
		})
		.join(' ')
}

/**
 * The address in the form that the map data holds: no secondary unit, and the
 * street words in full. Only the first part of the address, up to the first
 * comma, is the street. The city and the state stay as typed.
 */
export function mapAddress(address: string): string {
	const parts = address
		.replace(UNIT, ' ')
		.split(',')
		.map((part) => part.replace(/\s+/g, ' ').trim())
		.filter((part) => part !== '')

	const [street = '', ...rest] = parts

	return [expandStreet(street), ...rest].join(', ')
}

/**
 * The queries for a typed address, in the order to search them. There is one
 * query where the address is already in the form of the map data.
 */
export function addressQueries(address: string): string[] {
	const typed = address.trim()

	const mapped = mapAddress(typed)

	return mapped === typed || mapped === '' ? [typed] : [typed, mapped]
}
