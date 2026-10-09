'use client'

import { type ReactNode, useEffect, useEffectEvent, useId, useState } from 'react'
import { useAriaIds } from '../../hooks'
import { Message } from '../fieldset'
import { useControl } from './context'

type ControlTypedVerdictOptions = {
	/** The `aria-describedby` of the caller. The ids of the caller come first. */
	describedBy: string | undefined
	/** The text of the built-in Message. A falsy value shows no Message. */
	message: ReactNode
	/** Reports the verdict that a {@link ControlTypedVerdict.clear} leaves behind. Runs in an effect. */
	reportCleared: () => void
}

type ControlTypedVerdict = {
	/** True while the field refuses its typed text. */
	invalid: boolean
	setInvalid: (invalid: boolean) => void
	/** Drops the verdict for a value from outside. Safe to call during render. */
	clear: () => void
	/** The `aria-describedby` of the input. */
	describedBy: string | undefined
	/** The built-in error Message, or `null`. Render it after the input. */
	message: ReactNode
}

/**
 * The verdict of a masked field on its typed text, for `DateInput` and
 * `CreditCardInputExpiry`.
 *
 * @remarks
 * The built-in Message always takes an id of its own, so it never shares the
 * id of the error slot of a Field with a different error Message. Inside a
 * Control, the Message registers its id into the `aria-describedby` of the
 * field. Outside one, the input references it.
 *
 * A value from outside clears the verdict during render, where a report must
 * not run. Thus `clear` counts the clears, and an effect carries the report,
 * so the reported verdict cannot drift from the one that the field renders.
 * @internal
 */
export function useControlTypedVerdict({
	describedBy,
	message,
	reportCleared,
}: ControlTypedVerdictOptions): ControlTypedVerdict {
	const control = useControl()

	const [invalid, setInvalid] = useState(false)

	const [clears, setClears] = useState(0)

	const report = useEffectEvent(reportCleared)

	useEffect(() => {
		if (clears > 0) report()
	}, [clears])

	const shown = invalid && Boolean(message)

	const messageId = useId()

	const ids = useAriaIds(describedBy, shown && control === undefined ? messageId : undefined)

	return {
		invalid,
		setInvalid,
		clear: () => {
			setInvalid(false)

			setClears((count) => count + 1)
		},
		describedBy: ids,
		message: shown ? (
			<Message severity="error" id={messageId}>
				{message}
			</Message>
		) : null,
	}
}
