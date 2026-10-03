'use client'

import { useState } from 'react'
import { useFormResets } from '../form/context'
import { isSameDay } from './date-input-utilities'

type DateInputOverrideOptions = {
	/** The resolved value. */
	date: Date | undefined
	/** The last value that the field committed itself. */
	emitted: Date | undefined
	/** The bound Form field. A field without one ignores Form resets. */
	name: string | undefined
	/** True while the field holds typed text. */
	editing: boolean
	/** Drops the typed text and its verdict. Runs during render. */
	onOverride: () => void
}

/**
 * Calls `onOverride` when a change from outside overrides the typed text of a
 * {@link DateInput}.
 *
 * @remarks
 * A change from outside is a new value that the field did not commit, such as
 * a calendar pick, or a reset of the bound Form. A reset that leaves the value
 * as it was (a partial entry over an empty field) does not change the value, so
 * the Form reset count tells it apart. The check runs during render, so
 * `onOverride` must only set state.
 * @internal
 */
export function useDateInputOverride({
	date,
	emitted,
	name,
	editing,
	onOverride,
}: DateInputOverrideOptions) {
	const formResets = useFormResets()

	const resets = name === undefined ? 0 : formResets

	const [known, setKnown] = useState({ date, resets })

	if (known.date === date && known.resets === resets) return

	setKnown({ date, resets })

	const external = known.resets !== resets || !isSameDay(date, emitted)

	if (editing && external) onOverride()
}
