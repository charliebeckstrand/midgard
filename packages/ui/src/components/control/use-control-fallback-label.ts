'use client'

import { useEffect, useState } from 'react'
import { useControl } from './context'

/**
 * Gives the default `aria-label` of a field that must have a name when nothing
 * else names it, such as "Add tags" on a TagInput.
 *
 * @remarks
 * A field `<Label>` renders with `htmlFor` at the control id, so the native
 * label names the field from the first render, the server render included. An
 * `aria-label` outranks the native label, and the Label registers only in an
 * effect. Thus, in a `<Field>` or `<Control>`, the fallback stays off until the
 * effects ran, and then it is on only when no Label registered. Outside a
 * control, the fallback is the name from the first render.
 *
 * @param fallback - The default name.
 * @returns The fallback, or `undefined` when a field Label can name the field.
 * @internal Not on the barrel. It backs the fields that default a name.
 */
export function useControlFallbackLabel(fallback: string | undefined): string | undefined {
	const control = useControl()

	const inControl = control !== undefined

	// False in the first render. It becomes true after the effects of the first
	// commit, together with the registration of a Label.
	const [settled, setSettled] = useState(false)

	useEffect(() => {
		if (inControl) setSettled(true)
	}, [inControl])

	if (!inControl) return fallback

	return settled && !control.labelledBy ? fallback : undefined
}
