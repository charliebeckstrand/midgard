'use client'

import { useState } from 'react'
import { isSameDayOrEmpty, isSameInstant } from '../calendar/calendar-utilities'
import { useDateInputResets } from './context'

type DateInputOverrideOptions = {
	/** The resolved value. */
	date: Date | undefined
	/**
	 * The bound Form field. A field without one reads the reset count that an
	 * enclosing picker passes down, else it ignores Form resets.
	 */
	name: string | undefined
	/** True while the field holds typed text. */
	editing: boolean
	/** Drops the typed text and its verdict. Runs during render. */
	onOverride: () => void
}

/** The value and the Form reset count that the field saw last, and its own commit after them. @internal */
type DateInputKnown = {
	date: Date | undefined
	resets: number
	/** The value that the field committed after the last change that it saw. */
	commit: { date: Date | undefined } | undefined
}

/**
 * Calls `onOverride` when a change from outside overrides the typed text of a
 * {@link DateInput}.
 *
 * @remarks
 * A change is a new instant of the value, or a reset of the bound Form. A new
 * `Date` of the same instant is not a change. A change is from outside unless
 * it falls on the day that the field committed after the last change that it
 * saw. Thus a calendar pick overrides the typed text, also when the pick
 * returns to an earlier commit of the field. A reset that leaves the value as
 * it was (a partial entry over an empty field) does not change the value, so
 * the Form reset count tells it apart. The check runs during render, so
 * `onOverride` must only set state.
 * @returns A function that records a commit of the field. Call it in the same
 * batch as the commit of the value, so the render that sees the value also
 * sees the commit.
 * @internal
 */
export function useDateInputOverride({
	date,
	name,
	editing,
	onOverride,
}: DateInputOverrideOptions): (committed: Date | undefined) => void {
	const resets = useDateInputResets(name)

	const [known, setKnown] = useState<DateInputKnown>({ date, resets, commit: undefined })

	const recordCommit = (committed: Date | undefined) => {
		setKnown((current) => ({ ...current, commit: { date: committed } }))
	}

	const reset = known.resets !== resets

	if (reset || !isSameInstant(known.date, date)) {
		setKnown({ date, resets, commit: undefined })

		const echo = known.commit !== undefined && isSameDayOrEmpty(date, known.commit.date)

		if (editing && (reset || !echo)) onOverride()
	}

	return recordCommit
}
