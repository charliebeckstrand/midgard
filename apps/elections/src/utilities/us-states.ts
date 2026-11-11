/** A state of the US, or the District of Columbia. */
export type UsState = {
	/** The lowercase postal code, the region key of civicAPI, such as `ga`. */
	key: string
	name: string
	/** The 2-digit FIPS code, the id of the state in `us-atlas`. */
	fips: string
}

/** The states and the District of Columbia, by name. */
export const US_STATES: readonly UsState[] = [
	{ key: 'al', name: 'Alabama', fips: '01' },
	{ key: 'ak', name: 'Alaska', fips: '02' },
	{ key: 'az', name: 'Arizona', fips: '04' },
	{ key: 'ar', name: 'Arkansas', fips: '05' },
	{ key: 'ca', name: 'California', fips: '06' },
	{ key: 'co', name: 'Colorado', fips: '08' },
	{ key: 'ct', name: 'Connecticut', fips: '09' },
	{ key: 'de', name: 'Delaware', fips: '10' },
	{ key: 'dc', name: 'District of Columbia', fips: '11' },
	{ key: 'fl', name: 'Florida', fips: '12' },
	{ key: 'ga', name: 'Georgia', fips: '13' },
	{ key: 'hi', name: 'Hawaii', fips: '15' },
	{ key: 'id', name: 'Idaho', fips: '16' },
	{ key: 'il', name: 'Illinois', fips: '17' },
	{ key: 'in', name: 'Indiana', fips: '18' },
	{ key: 'ia', name: 'Iowa', fips: '19' },
	{ key: 'ks', name: 'Kansas', fips: '20' },
	{ key: 'ky', name: 'Kentucky', fips: '21' },
	{ key: 'la', name: 'Louisiana', fips: '22' },
	{ key: 'me', name: 'Maine', fips: '23' },
	{ key: 'md', name: 'Maryland', fips: '24' },
	{ key: 'ma', name: 'Massachusetts', fips: '25' },
	{ key: 'mi', name: 'Michigan', fips: '26' },
	{ key: 'mn', name: 'Minnesota', fips: '27' },
	{ key: 'ms', name: 'Mississippi', fips: '28' },
	{ key: 'mo', name: 'Missouri', fips: '29' },
	{ key: 'mt', name: 'Montana', fips: '30' },
	{ key: 'ne', name: 'Nebraska', fips: '31' },
	{ key: 'nv', name: 'Nevada', fips: '32' },
	{ key: 'nh', name: 'New Hampshire', fips: '33' },
	{ key: 'nj', name: 'New Jersey', fips: '34' },
	{ key: 'nm', name: 'New Mexico', fips: '35' },
	{ key: 'ny', name: 'New York', fips: '36' },
	{ key: 'nc', name: 'North Carolina', fips: '37' },
	{ key: 'nd', name: 'North Dakota', fips: '38' },
	{ key: 'oh', name: 'Ohio', fips: '39' },
	{ key: 'ok', name: 'Oklahoma', fips: '40' },
	{ key: 'or', name: 'Oregon', fips: '41' },
	{ key: 'pa', name: 'Pennsylvania', fips: '42' },
	{ key: 'ri', name: 'Rhode Island', fips: '44' },
	{ key: 'sc', name: 'South Carolina', fips: '45' },
	{ key: 'sd', name: 'South Dakota', fips: '46' },
	{ key: 'tn', name: 'Tennessee', fips: '47' },
	{ key: 'tx', name: 'Texas', fips: '48' },
	{ key: 'ut', name: 'Utah', fips: '49' },
	{ key: 'vt', name: 'Vermont', fips: '50' },
	{ key: 'va', name: 'Virginia', fips: '51' },
	{ key: 'wa', name: 'Washington', fips: '53' },
	{ key: 'wv', name: 'West Virginia', fips: '54' },
	{ key: 'wi', name: 'Wisconsin', fips: '55' },
	{ key: 'wy', name: 'Wyoming', fips: '56' },
]

const byKey = new Map(US_STATES.map((state) => [state.key, state]))

const byFips = new Map(US_STATES.map((state) => [state.fips, state]))

/** The segment of a state in the URL: its name in lower case, with a hyphen for each space, such as `new-york`. */
export function stateSlug(state: UsState): string {
	return state.name.toLowerCase().replaceAll(' ', '-')
}

const bySlug = new Map(US_STATES.map((state) => [stateSlug(state), state]))

/** The state of a region key, such as `ga`, or `undefined` for a key that names none. */
export function findStateByKey(key: string): UsState | undefined {
	return byKey.get(key)
}

/** The state of a 2-digit FIPS code, or `undefined` for a code that names none. */
export function findStateByFips(fips: string): UsState | undefined {
	return byFips.get(fips)
}

/** The state of a segment of the URL, such as `new-york`, or `undefined` for a segment that names none. */
export function findStateBySlug(slug: string): UsState | undefined {
	return bySlug.get(slug)
}
