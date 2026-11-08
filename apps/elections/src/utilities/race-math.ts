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

/**
 * The lead as a signed value for a map of two parties: negative for a
 * Democratic lead and positive for a Republican one. `null` where the race is
 * unopposed or another party leads, because a scale from blue to red has no
 * place for it.
 */
export function signedMargin(candidates: readonly Candidate[]): number | null {
	const points = lead(candidates)

	const slot = candidates[0]?.slot

	if (points === null) return null

	if (slot === 'blue') return -points

	if (slot === 'red') return points

	return null
}

/** The letter of a party in a margin, such as `D` for Democratic. */
export function partyLetter(party: string): string {
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

/**
 * A signed margin of a two-party map as text, to one decimal at most:
 * `D+12.4`, `R+8`, or `Even`. The ends of the range bar read `D+35` and `R+35`.
 */
export function signedLabel(value: number): string {
	const points = Math.round(Math.abs(value) * 10) / 10

	if (points === 0) return 'Even'

	return `${value < 0 ? 'D' : 'R'}+${points}`
}

/** A signed seat share of a two-party map as text: `-50` reads `100% D`, `10` reads `60% R`. */
export function shareLabel(value: number): string {
	if (value === 0) return 'Even'

	return `${Math.round(50 + Math.abs(value))}% ${value < 0 ? 'D' : 'R'}`
}

/** The seats of a delegation that each party won, and the seats not called yet. */
export type Delegation = {
	/** The seats won by each party, most seats first. */
	parties: { party: string; slot: PartySlot; seats: number }[]
	called: number
	total: number
}

/** The delegation of a state from the races of its districts. */
export function delegation(districts: readonly (readonly Candidate[])[]): Delegation {
	const won = new Map<string, { party: string; slot: PartySlot; seats: number }>()

	for (const candidates of districts) {
		const winner = candidates.find((candidate) => candidate.winner)

		if (winner === undefined) continue

		const held = won.get(winner.party)

		won.set(winner.party, {
			party: winner.party,
			slot: winner.slot,
			seats: (held?.seats ?? 0) + 1,
		})
	}

	const parties = [...won.values()].sort((a, b) => b.seats - a.seats)

	return {
		parties,
		called: parties.reduce((sum, party) => sum + party.seats, 0),
		total: districts.length,
	}
}

/**
 * The seat share of a delegation as a signed value for a map of two parties:
 * `-50` when the Democrats won every called seat, `50` when the Republicans
 * did, and `0` for an even split. `null` with no called seat.
 */
export function signedShare(state: Delegation): number | null {
	if (state.called === 0) return null

	const seats = (party: string) => state.parties.find((entry) => entry.party === party)?.seats ?? 0

	return ((seats('Republican') - seats('Democratic')) / state.called) * 50
}

/** The fill of a party on a bar: its slot where a bar has one, and zinc for any other. */
export function barColor(slot: PartySlot): 'blue' | 'red' | 'amber' | 'zinc' {
	return slot === 'blue' || slot === 'red' || slot === 'amber' ? slot : 'zinc'
}

/** The initials of a candidate for an avatar, such as `JO` for Jon Ossoff. */
export function initials(name: string): string {
	const words = name.split(' ').filter((word) => /^[A-Za-z]/.test(word))

	const first = words[0]?.charAt(0) ?? ''

	const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : ''

	return `${first}${last}`.toUpperCase()
}

/** A share from 0 to 100 as text in the locale of the reader, such as `59.0%`. */
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

/** The suffixes of a name that are not the surname, such as `Jr.` or `III`. */
const NAME_SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i

/** The surname of a candidate, such as `Ossoff` for Jon Ossoff, or `Begich` for Nick Begich III. */
export function surname(name: string): string {
	const words = name.split(' ').filter((word) => !NAME_SUFFIX.test(word))

	return words.at(-1) ?? name
}
