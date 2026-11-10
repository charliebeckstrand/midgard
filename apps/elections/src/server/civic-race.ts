import type {
	Candidate,
	CountyResult,
	NationalRace,
	PartySeats,
	PartySlot,
	Race,
	RegionRace,
} from '../types'

/**
 * The reader of civicAPI answers. It reads each field the screens need into the
 * types of the app, and fails closed: an answer without such a field throws, and
 * the error boundary of the page shows it. A skipped row would change a total
 * with no sign, and an error does not. A field the screens can do without, such
 * as `called_at`, is optional.
 */

/** An answer of civicAPI that does not have the shape the app reads. */
export class CivicShapeError extends Error {
	override name = 'CivicShapeError'
}

type Json = Record<string, unknown>

function record(value: unknown, path: string): Json {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new CivicShapeError(`${path} is not an object.`)
	}

	return value as Json
}

function list(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) throw new CivicShapeError(`${path} is not a list.`)

	return value
}

function text(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new CivicShapeError(`${path} is not a text.`)
	}

	// civicAPI writes some names with two spaces, such as "Pete  Ricketts".
	return value.trim().replace(/\s+/g, ' ')
}

function count(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		throw new CivicShapeError(`${path} is not a number.`)
	}

	return value
}

function optionalText(value: unknown): string | null {
	return typeof value === 'string' && value !== '' ? value : null
}

/**
 * The color of a party in the US: Democratic is blue, Republican is red, a
 * candidate with no party is zinc, and any other party is amber. Green stays
 * free, because green is a call.
 */
export function partySlot(party: string): PartySlot {
	if (party === 'Democratic') return 'blue'

	if (party === 'Republican') return 'red'

	if (NONPARTY.has(party)) return 'zinc'

	return 'amber'
}

/** The party of a choice with none, such as `None of These Candidates` on the ballot of Nevada. */
export const NO_PARTY = 'No party'

/**
 * The parties that name no party: a nonpartisan race, a write-in, and a choice
 * with none. They take zinc, so that amber is only for a third party.
 */
const NONPARTY: ReadonlySet<string> = new Set(['Nonpartisan', 'Write-In', NO_PARTY])

/** The party of a candidate. An empty party is a choice with no party, and any other value throws. */
function readParty(value: unknown, path: string): string {
	if (value === '') return NO_PARTY

	return text(value, path)
}

function readCandidate(value: unknown, path: string): Candidate {
	const raw = record(value, path)

	const party = readParty(raw.party, `${path}.party`)

	return {
		name: text(raw.name, `${path}.name`),
		party,
		slot: partySlot(party),
		votes: count(raw.votes, `${path}.votes`),
		percent: count(raw.percent, `${path}.percent`),
		winner: raw.winner === true,
		incumbent: raw.incumbent === true,
	}
}

/** The candidates of a race or a region, most votes first. */
function readCandidates(value: unknown, path: string): Candidate[] {
	const candidates = list(value, path).map((entry, index) =>
		readCandidate(entry, `${path}[${index}]`),
	)

	if (candidates.length === 0) throw new CivicShapeError(`${path} has no candidates.`)

	return candidates.sort((a, b) => b.votes - a.votes)
}

/**
 * The FIPS codes of the counties of each state, by the name of the county in
 * lowercase, from the county atlas. The parser reads a county that civicAPI
 * sends with no FIPS code through it.
 */
export type CountyNames = (stateFips: string) => ReadonlyMap<string, string>

/**
 * A name in the form that the atlas lookup keys on: lowercase, with no periods
 * and single spaces. civicAPI writes `St Joseph` where the atlas has `St. Joseph`.
 */
export function foldName(name: string): string {
	return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

/** The 5-digit FIPS code of a county. */
const FIPS = /^\d{5}$/

/**
 * The counties of Alaska that the atlas does not have, by the county that holds
 * them in the atlas. civicAPI reports Chugach and Copper River, and the atlas
 * still draws the Valdez-Cordova Census Area that they replaced in 2019.
 */
const MERGED: Record<string, { fips: string; name: string }> = {
	'02063': { fips: '02261', name: 'Valdez-Cordova' },
	'02066': { fips: '02261', name: 'Valdez-Cordova' },
}

/** The votes of a county or a part of one. */
function countedVotes(part: CountyResult): number {
	return part.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)
}

/**
 * Adds the candidates of two parts of one county, by name. The percent
 * reporting of the county is the share of the expected vote of the parts that
 * is in. The expected vote of a part is its votes over its percent reporting,
 * so a part with 0% reporting has no known expected vote and adds none.
 */
function mergeCounty(a: CountyResult, b: CountyResult): CountyResult {
	const votes = new Map<string, Candidate>()

	for (const candidate of [...a.candidates, ...b.candidates]) {
		const held = votes.get(candidate.name)

		votes.set(candidate.name, held ? { ...held, votes: held.votes + candidate.votes } : candidate)
	}

	const total = [...votes.values()].reduce((sum, candidate) => sum + candidate.votes, 0)

	const counted = [a, b].filter((part) => part.reporting > 0)

	const expected = counted.reduce(
		(sum, part) => sum + (countedVotes(part) * 100) / part.reporting,
		0,
	)

	const reporting =
		expected === 0
			? a.reporting
			: (counted.reduce((sum, part) => sum + countedVotes(part), 0) * 100) / expected

	return {
		...a,
		reporting,
		candidates: [...votes.values()]
			.map((candidate) => ({
				...candidate,
				percent: total === 0 ? 0 : (candidate.votes / total) * 100,
			}))
			.sort((x, y) => y.votes - x.votes),
	}
}

/**
 * The FIPS code of a row of a race: its own code, the code of the atlas county
 * of its name for a `County` row with none, or `null` for a part of a county.
 * A `County` row with no code, no atlas county, and no votes is also `null`,
 * because it changes no total. Chicago is such a row in the House districts of
 * Illinois, and Cook holds its votes.
 */
function readCountyFips(
	row: Json,
	name: string,
	path: string,
	atlas: ReadonlyMap<string, string>,
): string | null {
	if (typeof row.fips === 'string' && FIPS.test(row.fips)) return row.fips

	if (row.type !== 'County') return null

	const fips = atlas.get(foldName(name))

	if (fips !== undefined) return fips

	const candidates = readCandidates(row.candidates, `${path}.candidates`)

	if (candidates.every((candidate) => candidate.votes === 0)) return null

	throw new CivicShapeError(`${path} names no county of the atlas.`)
}

/**
 * The counties of a race, joined to the county atlas. A row with a FIPS code is
 * a county, a parish, a borough, or a city. A row of the type `County` with no
 * code takes the code of the atlas county of the same name in its state, and
 * one with no such county and no votes is left out. Every other row is a part
 * that a county row already holds, so the reader leaves it out. Such a part is
 * a town, a township, a planning region, a state house district, or the
 * overseas votes.
 */
function readCounties(
	value: unknown,
	path: string,
	stateFips: string,
	names: CountyNames,
): CountyResult[] {
	const rows = record(value, path)

	const counties = new Map<string, CountyResult>()

	for (const [slug, entry] of Object.entries(rows)) {
		const at = `${path}.${slug}`

		const row = record(entry, at)

		const name = text(row.name, `${at}.name`)

		const fips = readCountyFips(row, name, at, names(stateFips))

		if (fips === null) continue

		const merged = MERGED[fips]

		const county: CountyResult = {
			fips: merged?.fips ?? fips,
			name: merged?.name ?? name,
			reporting: count(row.percent_reporting, `${at}.percent_reporting`),
			candidates: readCandidates(row.candidates, `${at}.candidates`),
		}

		const held = counties.get(county.fips)

		counties.set(county.fips, held ? mergeCounty(held, county) : county)
	}

	return [...counties.values()]
}

/**
 * Reads one race, as `race/{id}` gives it.
 *
 * @param id - The id of the race.
 * @param value - The answer of civicAPI.
 * @param stateFips - The 2-digit FIPS code of the state of the race.
 * @param names - The county codes of each state by name, for a county with no code.
 */
export function readRace(id: number, value: unknown, stateFips: string, names: CountyNames): Race {
	const raw = record(value, 'race')

	const name = text(raw.election_name, 'race.election_name')

	return {
		id,
		name,
		region: text(raw.province, 'race.province').toLowerCase(),
		special: /\bspecial\b/i.test(name),
		reporting: count(raw.percent_reporting, 'race.percent_reporting'),
		updated: text(raw.last_updated, 'race.last_updated'),
		pollsClose: optionalText(raw.polls_close),
		calledAt: optionalText(raw.called_at),
		candidates: readCandidates(raw.candidates, 'race.candidates'),
		counties: readCounties(raw.region_results, 'race.region_results', stateFips, names),
	}
}

/** The seats of each party of a national race that holds one, most seats first. */
function readParties(value: unknown): PartySeats[] {
	return list(value, 'race.candidates')
		.map((entry, index) => {
			const path = `race.candidates[${index}]`

			const raw = record(entry, path)

			const party = text(raw.party, `${path}.party`)

			return {
				party,
				name: text(raw.name, `${path}.name`),
				slot: partySlot(party),
				seats: count(raw.seats, `${path}.seats`),
			}
		})
		.filter((party) => party.seats > 0)
		.sort((a, b) => b.seats - a.seats)
}

function readRegion(key: string, value: unknown): RegionRace {
	const path = `race.region_results.${key}`

	const raw = record(value, path)

	return {
		key,
		name: text(raw.name, `${path}.name`),
		raceId: count(raw.election_id, `${path}.election_id`),
		reporting: count(raw.percent_reporting, `${path}.percent_reporting`),
		candidates: readCandidates(raw.candidates, `${path}.candidates`),
	}
}

/**
 * Reads a national race, as an aggregate such as `race/87528` gives it: the
 * seats of each party, and the race of each region.
 */
export function readNationalRace(id: number, value: unknown): NationalRace {
	const raw = record(value, 'race')

	return {
		id,
		name: text(raw.election_name, 'race.election_name'),
		reporting: count(raw.percent_reporting, 'race.percent_reporting'),
		updated: text(raw.last_updated, 'race.last_updated'),
		parties: readParties(raw.candidates),
		regions: Object.entries(record(raw.region_results, 'race.region_results')).map(
			([key, region]) => readRegion(key, region),
		),
	}
}
