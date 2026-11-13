/** A state of the US, or the District of Columbia. */
export type UsState = {
	/** The lowercase postal code, the region key of civicAPI, such as `ga`. */
	key: string
	name: string
	/** The 2-digit FIPS code, the id of the state in `us-atlas`. */
	fips: string
	/**
	 * The IANA time zone of the state, such as `America/Chicago`. A state with
	 * more than one zone takes the zone of most of its people.
	 */
	zone: string
}

/** The states and the District of Columbia, by name. */
export const US_STATES: readonly UsState[] = [
	{ key: 'al', name: 'Alabama', fips: '01', zone: 'America/Chicago' },
	{ key: 'ak', name: 'Alaska', fips: '02', zone: 'America/Anchorage' },
	{ key: 'az', name: 'Arizona', fips: '04', zone: 'America/Phoenix' },
	{ key: 'ar', name: 'Arkansas', fips: '05', zone: 'America/Chicago' },
	{ key: 'ca', name: 'California', fips: '06', zone: 'America/Los_Angeles' },
	{ key: 'co', name: 'Colorado', fips: '08', zone: 'America/Denver' },
	{ key: 'ct', name: 'Connecticut', fips: '09', zone: 'America/New_York' },
	{ key: 'de', name: 'Delaware', fips: '10', zone: 'America/New_York' },
	{ key: 'dc', name: 'District of Columbia', fips: '11', zone: 'America/New_York' },
	{ key: 'fl', name: 'Florida', fips: '12', zone: 'America/New_York' },
	{ key: 'ga', name: 'Georgia', fips: '13', zone: 'America/New_York' },
	{ key: 'hi', name: 'Hawaii', fips: '15', zone: 'Pacific/Honolulu' },
	{ key: 'id', name: 'Idaho', fips: '16', zone: 'America/Boise' },
	{ key: 'il', name: 'Illinois', fips: '17', zone: 'America/Chicago' },
	{ key: 'in', name: 'Indiana', fips: '18', zone: 'America/Indiana/Indianapolis' },
	{ key: 'ia', name: 'Iowa', fips: '19', zone: 'America/Chicago' },
	{ key: 'ks', name: 'Kansas', fips: '20', zone: 'America/Chicago' },
	{ key: 'ky', name: 'Kentucky', fips: '21', zone: 'America/New_York' },
	{ key: 'la', name: 'Louisiana', fips: '22', zone: 'America/Chicago' },
	{ key: 'me', name: 'Maine', fips: '23', zone: 'America/New_York' },
	{ key: 'md', name: 'Maryland', fips: '24', zone: 'America/New_York' },
	{ key: 'ma', name: 'Massachusetts', fips: '25', zone: 'America/New_York' },
	{ key: 'mi', name: 'Michigan', fips: '26', zone: 'America/Detroit' },
	{ key: 'mn', name: 'Minnesota', fips: '27', zone: 'America/Chicago' },
	{ key: 'ms', name: 'Mississippi', fips: '28', zone: 'America/Chicago' },
	{ key: 'mo', name: 'Missouri', fips: '29', zone: 'America/Chicago' },
	{ key: 'mt', name: 'Montana', fips: '30', zone: 'America/Denver' },
	{ key: 'ne', name: 'Nebraska', fips: '31', zone: 'America/Chicago' },
	{ key: 'nv', name: 'Nevada', fips: '32', zone: 'America/Los_Angeles' },
	{ key: 'nh', name: 'New Hampshire', fips: '33', zone: 'America/New_York' },
	{ key: 'nj', name: 'New Jersey', fips: '34', zone: 'America/New_York' },
	{ key: 'nm', name: 'New Mexico', fips: '35', zone: 'America/Denver' },
	{ key: 'ny', name: 'New York', fips: '36', zone: 'America/New_York' },
	{ key: 'nc', name: 'North Carolina', fips: '37', zone: 'America/New_York' },
	{ key: 'nd', name: 'North Dakota', fips: '38', zone: 'America/Chicago' },
	{ key: 'oh', name: 'Ohio', fips: '39', zone: 'America/New_York' },
	{ key: 'ok', name: 'Oklahoma', fips: '40', zone: 'America/Chicago' },
	{ key: 'or', name: 'Oregon', fips: '41', zone: 'America/Los_Angeles' },
	{ key: 'pa', name: 'Pennsylvania', fips: '42', zone: 'America/New_York' },
	{ key: 'ri', name: 'Rhode Island', fips: '44', zone: 'America/New_York' },
	{ key: 'sc', name: 'South Carolina', fips: '45', zone: 'America/New_York' },
	{ key: 'sd', name: 'South Dakota', fips: '46', zone: 'America/Chicago' },
	{ key: 'tn', name: 'Tennessee', fips: '47', zone: 'America/Chicago' },
	{ key: 'tx', name: 'Texas', fips: '48', zone: 'America/Chicago' },
	{ key: 'ut', name: 'Utah', fips: '49', zone: 'America/Denver' },
	{ key: 'vt', name: 'Vermont', fips: '50', zone: 'America/New_York' },
	{ key: 'va', name: 'Virginia', fips: '51', zone: 'America/New_York' },
	{ key: 'wa', name: 'Washington', fips: '53', zone: 'America/Los_Angeles' },
	{ key: 'wv', name: 'West Virginia', fips: '54', zone: 'America/New_York' },
	{ key: 'wi', name: 'Wisconsin', fips: '55', zone: 'America/Chicago' },
	{ key: 'wy', name: 'Wyoming', fips: '56', zone: 'America/Denver' },
]

const byKey = new Map(US_STATES.map((state) => [state.key, state]))

const byFips = new Map(US_STATES.map((state) => [state.fips, state]))

/** The segment of a state in the URL: its name in lower case, with a hyphen for each space, such as `new-york`. */
export function stateSlug(state: UsState): string {
	return state.name.toLowerCase().replaceAll(' ', '-')
}

const bySlug = new Map(US_STATES.map((state) => [stateSlug(state), state]))

/** The state of a region key, such as `ga`, or `undefined` for a key that names none. */
export function stateOfKey(key: string): UsState | undefined {
	return byKey.get(key)
}

/** The state of a 2-digit FIPS code, or `undefined` for a code that names none. */
export function stateOfFips(fips: string): UsState | undefined {
	return byFips.get(fips)
}

/** The state of a segment of the URL, such as `new-york`, or `undefined` for a segment that names none. */
export function stateOfSlug(slug: string): UsState | undefined {
	return bySlug.get(slug)
}
