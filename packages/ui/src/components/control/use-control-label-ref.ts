'use client'

import { type Ref, type RefCallback, useRef } from 'react'
import { useComposedRef } from '../../hooks'
import { useControlFallbackLabel } from './use-control-fallback-label'

/**
 * The default `aria-label` of an input, and the ref that lets the default read
 * the labels of the input.
 *
 * @remarks
 * The fallback reads the labels of the input after each commit, so a native
 * `<label for>` outside a Field also turns it off. See
 * {@link useControlFallbackLabel}.
 * @param fallback - The default name.
 * @param ref - The ref of the caller, composed into the returned ref.
 * @returns The ref to give to the input, and the fallback or `undefined`.
 * @internal
 */
export function useControlLabelRef(
	fallback: string,
	ref: Ref<HTMLInputElement> | undefined,
): { ref: RefCallback<HTMLInputElement> | null; fallbackLabel: string | undefined } {
	const inputRef = useRef<HTMLInputElement>(null)

	const fallbackLabel = useControlFallbackLabel(fallback, inputRef)

	return { ref: useComposedRef(ref, inputRef), fallbackLabel }
}
