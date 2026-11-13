import type { MapSeriesColor } from 'ui/map'
import type { DateText } from 'ui/server'

/**
 * The color of a party: a series slot of the data-viz palette, never a raw
 * CSS color, so that a mark keeps its light, dark, and forced-colors steps.
 */
export type PartySlot = MapSeriesColor

/** One candidate of a race, or of one county of a race. */
export type Candidate = {
	name: string
	/** The party, as civicAPI names it, such as `Democratic`. */
	party: string
	/** The color of the party. */
	slot: PartySlot
	votes: number
	/** The share of the votes, from 0 to 100. */
	percent: number
	/** civicAPI called the race for this candidate. */
	winner: boolean
	incumbent: boolean
}

/** The result of a race in one county, joined to the county atlas by its FIPS code. */
export type CountyResult = {
	/** The 5-digit FIPS code, the id of the county in `us-atlas`. */
	fips: string
	name: string
	/** The percent of the expected vote that is in, from 0 to 100. */
	reporting: number
	/** The candidates, most votes first. */
	candidates: Candidate[]
}

/** One race, as `race/{id}` gives it. */
export type Race = {
	id: number
	/** The name of the race, such as `Georgia US Senate`. */
	name: string
	/** The state of the race, lowercase, such as `ga`. */
	region: string
	/** A special election, such as the Ohio Senate race of 2026. */
	special: boolean
	/** The percent of the expected vote that is in, from 0 to 100. */
	reporting: number
	/** When civicAPI last changed the race, as an ISO time. */
	updated: string
	/** When the polls closed, where civicAPI gives it, with its text in the zone of the state. */
	pollsClose: DateText | null
	/** When civicAPI called the race, where it gives it, with its text in the zone of the state. */
	calledAt: DateText | null
	/** The candidates, most votes first. */
	candidates: Candidate[]
	/** The counties of the race. A House race gives the counties inside its district. */
	counties: CountyResult[]
}

/** One region of a national race: a state, or a district such as `ga-06`. */
export type RegionRace = {
	/** The key of the region, such as `ga` or `ga-06`. */
	key: string
	name: string
	/** The id of the race of the region, for `race/{id}`. */
	raceId: number
	reporting: number
	/** The candidates, most votes first. */
	candidates: Candidate[]
}

/** The seats of one party in a chamber. */
export type PartySeats = {
	/** The party, such as `Democratic`. */
	party: string
	/** The plural name, such as `Democrats`. */
	name: string
	slot: PartySlot
	seats: number
}

/** A national race, as an aggregate such as `race/87528` gives it. */
export type NationalRace = {
	id: number
	name: string
	reporting: number
	updated: string
	/** The seats of each party that holds one, most seats first. */
	parties: PartySeats[]
	/** The race of each region. */
	regions: RegionRace[]
}
