'use client'

import { type RefObject, useEffect, useState } from 'react'
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
 * A field that gives `element` also yields to a native label that is not a
 * field Label, such as a `<label for>` outside a Field. The render cannot see
 * that label, so the hook reads `element.labels` after each commit. When the
 * element has a label, the fallback is off. Thus the server markup and the
 * hydration pass keep the fallback, and the attribute changes after hydration.
 *
 * @param fallback - The default name.
 * @param element - Optional ref to the labelable element that takes the name.
 * Without it, a native label outside a control does not turn off the fallback.
 * @returns The fallback, or `undefined` when a field Label or, with `element`,
 * a native label can name the field.
 * @internal Not on the barrel. It backs the fields that default a name.
 */
export function useControlFallbackLabel(
	fallback: string | undefined,
	element?: RefObject<HTMLInputElement | null>,
): string | undefined {
	const control = useControl()

	const inControl = control !== undefined

	// False in the first render. It becomes true after the effects of the first
	// commit, together with the registration of a Label.
	const [settled, setSettled] = useState(false)

	// False in the first render, so the hydration pass matches the server markup.
	const [nativeLabelled, setNativeLabelled] = useState(false)

	useEffect(() => {
		if (inControl) setSettled(true)
	}, [inControl])

	// After each commit, because a render can change the id that a label points
	// at. An update with the same value does not cause a loop.
	useEffect(() => {
		if (element) setNativeLabelled((element.current?.labels?.length ?? 0) > 0)
	})

	if (nativeLabelled) return undefined

	if (!inControl) return fallback

	return settled && !control.labelledBy ? fallback : undefined
}
