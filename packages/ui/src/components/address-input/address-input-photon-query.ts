/**
 * The reading of a Photon query: the trailing postal code or US state that
 * narrows where the rest of the query is searched.
 */

/** The text before a trailing place qualifier, and the qualifier. */
type QuerySplit = { rest: string; qualifier: string }

/**
 * The trailing parts of a query that can be a postal code, each with the text
 * before it. The list is empty where the query does not end in one. The text is
 * empty where the query is only a code.
 *
 * A candidate is the last word or the last two words, because a code such as
 * `SW1A 1AA` or `M5V 3L9` is two words. It must hold two digits or more and
 * three characters or more. Each word must hold a digit. Thus "5th Ave" and
 * "Pier 39" stay text. A US ZIP+4
 * reads as its first five digits, which is the code the geocoder holds.
 */
export function splitPostcode(query: string): QuerySplit[] {
	const words = query.trim().replace(/,/g, ' ').split(/\s+/)

	const candidates: QuerySplit[] = []

	for (const count of [2, 1]) {
		if (words.length < count) continue

		const tail = words.slice(-count).join(' ')

		if (!/^[A-Za-z0-9]{2,5}(?:[ -][A-Za-z0-9]{2,4})?$/.test(tail)) continue

		if ((tail.match(/\d/g) ?? []).length < 2 || tail.length < 3) continue

		// Every word of a code holds a digit, so "Pier 39" is not a code.
		if (!tail.split(/[ -]/).every((part) => /\d/.test(part))) continue

		const zipPlusFour = /^(\d{5})-\d{4}$/.exec(tail)

		candidates.push({
			rest: words.slice(0, -count).join(' '),
			qualifier: zipPlusFour?.[1] ?? tail.toUpperCase(),
		})
	}

	return candidates
}

/** A code with its spaces removed, so that `sw1a1aa` and `SW1A 1AA` compare equal. */
export function compact(code: string): string {
	return code.replace(/\s+/g, '').toUpperCase()
}

/** The US states, the District of Columbia, and Puerto Rico, by USPS code. */
const US_STATES: Record<string, string> = {
	AL: 'Alabama',
	AK: 'Alaska',
	AZ: 'Arizona',
	AR: 'Arkansas',
	CA: 'California',
	CO: 'Colorado',
	CT: 'Connecticut',
	DE: 'Delaware',
	DC: 'District of Columbia',
	FL: 'Florida',
	GA: 'Georgia',
	HI: 'Hawaii',
	ID: 'Idaho',
	IL: 'Illinois',
	IN: 'Indiana',
	IA: 'Iowa',
	KS: 'Kansas',
	KY: 'Kentucky',
	LA: 'Louisiana',
	ME: 'Maine',
	MD: 'Maryland',
	MA: 'Massachusetts',
	MI: 'Michigan',
	MN: 'Minnesota',
	MS: 'Mississippi',
	MO: 'Missouri',
	MT: 'Montana',
	NE: 'Nebraska',
	NV: 'Nevada',
	NH: 'New Hampshire',
	NJ: 'New Jersey',
	NM: 'New Mexico',
	NY: 'New York',
	NC: 'North Carolina',
	ND: 'North Dakota',
	OH: 'Ohio',
	OK: 'Oklahoma',
	OR: 'Oregon',
	PA: 'Pennsylvania',
	PR: 'Puerto Rico',
	RI: 'Rhode Island',
	SC: 'South Carolina',
	SD: 'South Dakota',
	TN: 'Tennessee',
	TX: 'Texas',
	UT: 'Utah',
	VT: 'Vermont',
	VA: 'Virginia',
	WA: 'Washington',
	WV: 'West Virginia',
	WI: 'Wisconsin',
	WY: 'Wyoming',
}

const STATE_BY_NAME = new Map(
	Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), { code, name }]),
)

/** A US state as the query names it: its full name and its USPS code. */
export type UsState = { code: string; name: string }

/**
 * The trailing US state of a query, with the text before it. `null` where the
 * query does not end in one, or where the state is the whole query.
 *
 * A full name matches in any case, up to three words for "District of
 * Columbia". A USPS code matches only in capitals. In lowercase, "or", "in",
 * and "me" are words of the query.
 */
export function splitUsState(query: string): { rest: string; state: UsState } | null {
	const words = query.trim().replace(/,/g, ' ').split(/\s+/)

	for (const count of [3, 2, 1]) {
		if (words.length <= count) continue

		const tail = words.slice(-count).join(' ')

		const rest = words.slice(0, -count).join(' ')

		const named = STATE_BY_NAME.get(tail.toLowerCase())

		if (named !== undefined) return { rest, state: named }

		const coded = count === 1 ? US_STATES[tail] : undefined

		if (coded !== undefined) return { rest, state: { code: tail, name: coded } }
	}

	return null
}
