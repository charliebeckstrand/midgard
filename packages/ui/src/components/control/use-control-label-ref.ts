'use client'

import { useComposedRefs } from 'motion/react'
import { type Ref, type RefCallback, useRef } from 'react'
import { useControlFallbackLabel } from './use-control-fallback-label'

/**
 * The `aria-label` of an input, and the ref that lets the default name read
 * the labels of the input.
 *
 * @remarks
 * A placeholder is not a programmatic name (WCAG 3.3.2, 4.1.2), so the input
 * takes `fallback` as its `aria-label`. The fallback yields to a Field
 * `<Label>` from the first render, and it reads the labels of the input after
 * each commit, so a native `<label for>` outside a Field also turns it off.
 * See {@link useControlFallbackLabel}.
 * @param fallback - The default name.
 * @param ref - The ref of the caller, composed into the returned ref.
 * @param ariaLabel - The `aria-label` of the caller, which wins over the fallback.
 * @returns The ref to give to the input, and the `aria-label` or `undefined`.
 * @internal
 */
export function useControlLabelRef(
	fallback: string,
	ref: Ref<HTMLInputElement> | undefined,
	ariaLabel: string | undefined,
): { ref: RefCallback<HTMLInputElement>; ariaLabel: string | undefined } {
	const inputRef = useRef<HTMLInputElement>(null)

	const fallbackLabel = useControlFallbackLabel(fallback, inputRef)

	return { ref: useComposedRefs(ref, inputRef), ariaLabel: ariaLabel ?? fallbackLabel }
}
