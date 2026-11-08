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
