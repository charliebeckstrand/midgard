import type { IntlShape } from 'ui/primitives/intl'
import type { Candidate, PartySlot } from '../types'

/**
 * The numbers of a race that the screens show, from its two leading
 * candidates. They are computed here once, so every screen reads one rule.
 */

/** The leading candidate and the runner-up, of any party. A race with one candidate has no runner-up. */
export function leaders(candidates: readonly Candidate[]): {
	leader: Candidate | undefined
	runnerUp: Candidate | undefined
} {
	return { leader: candidates[0], runnerUp: candidates[1] }
}

/** Whether civicAPI called the race. A race with no winner is not called. */
export function isCalled(candidates: readonly Candidate[]): boolean {
	return candidates.some((candidate) => candidate.winner)
}

/**
 * The lead of the leader over the runner-up, in points, or `null` for a race
 * with one candidate, which is unopposed.
 */
export function lead(candidates: readonly Candidate[]): number | null {
	const { leader, runnerUp } = leaders(candidates)

	if (leader === undefined || runnerUp === undefined) return null

	return leader.percent - runnerUp.percent
}

/** The letter of a party in a margin, such as `D` for Democratic. */
function partyLetter(party: string): string {
	return party.charAt(0).toUpperCase()
}

/**
 * The lead as text, such as `D+12.4`, with the letter of the leading party. An
 * unopposed race reads `Unopposed`.
 */
export function marginLabel(candidates: readonly Candidate[], digits = 1): string {
	const points = lead(candidates)

	const leader = candidates[0]

	if (points === null || leader === undefined) return 'Unopposed'

	return `${partyLetter(leader.party)}+${points.toFixed(digits)}`
}

/** A count of seats of one party. */
type PartyCount = { party: string; slot: PartySlot; seats: number }

/** The seats of a delegation that each party won, and the seats not called yet. */
export type Delegation = {
	/** The seats won by each party, most seats first. */
	parties: PartyCount[]
	/** The seats not called that each party leads, most seats first. */
	leads: PartyCount[]
	called: number
	total: number
}

/** Adds one seat to the count of the party of a candidate. */
function addSeat(counts: Map<string, PartyCount>, candidate: Candidate) {
	const held = counts.get(candidate.party)

	counts.set(candidate.party, {
		party: candidate.party,
		slot: candidate.slot,
		seats: (held?.seats ?? 0) + 1,
	})
}

/** The counts of a map, most seats first. */
function bySeats(counts: Map<string, PartyCount>): PartyCount[] {
	return [...counts.values()].sort((a, b) => b.seats - a.seats)
}

/** The delegation of a state from the races of its districts. */
export function delegation(districts: readonly (readonly Candidate[])[]): Delegation {
	const won = new Map<string, PartyCount>()

	const led = new Map<string, PartyCount>()

	for (const candidates of districts) {
		const winner = candidates.find((candidate) => candidate.winner)

		const [leader] = candidates

		if (winner !== undefined) addSeat(won, winner)
		else if (leader !== undefined) addSeat(led, leader)
	}

	const parties = bySeats(won)

	return {
		parties,
		leads: bySeats(led),
		called: parties.reduce((sum, party) => sum + party.seats, 0),
		total: districts.length,
	}
}

/** The fill of a party on a bar: its slot where a bar has one, and zinc for any other. */
export function barColor(slot: PartySlot): 'blue' | 'red' | 'amber' | 'zinc' {
	return slot === 'blue' || slot === 'red' || slot === 'amber' ? slot : 'zinc'
}

/** The suffixes of a name that are not the surname, such as `Jr.` or `III`. */
const NAME_SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i

/**
 * The words of a name with no suffix. A comma separates words, as in
 * `Stewart Cathey, Jr.`, so no word keeps it.
 */
function nameWords(name: string): string[] {
	return name.split(/[\s,]+/).filter((word) => word !== '' && !NAME_SUFFIX.test(word))
}

/**
 * The initials of a candidate for an avatar, such as `JO` for Jon Ossoff, or
 * `NB` for Nick Begich III. A word that does not start with a letter, such as
 * a nickname in quotes, gives no initial.
 */
export function initials(name: string): string {
	const words = nameWords(name).filter((word) => /^\p{L}/u.test(word))

	const first = words[0]?.charAt(0) ?? ''

	const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : ''

	return `${first}${last}`.toUpperCase()
}

/** A share from 0 to 100 as text in the locale of the app (`en`), such as `59.0%`. */
export function percentText(
	format: IntlShape['formatNumber'],
	value: number,
	digits: number,
): string {
	return format(value / 100, {
		style: 'percent',
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	})
}

/** The surname of a candidate, such as `Ossoff` for Jon Ossoff, or `Begich` for Nick Begich III. */
export function surname(name: string): string {
	return nameWords(name).at(-1) ?? name
}
