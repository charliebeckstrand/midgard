'use client'

import type { Placement } from '@floating-ui/react'
import { useRef } from 'react'
import { useControllable, useFloatingUI } from '../../hooks'
import { useFloatingReference } from '../../hooks/use-floating-reference'
import { useIdScope } from '../../hooks/use-id-scope'
import { useControl } from '../control/context'
import type { ColorFormat, Hsva } from './types'
import { useColorState } from './use-color-state'

export type ColorPickerStateOptions = {
	value?: string | Hsva
	defaultValue?: string | Hsva
	format: ColorFormat
	alpha: boolean
	onValueChange?: (value: string | Hsva) => void
	onOpenChange?: (open: boolean) => void
	placement: Placement
	disabled: boolean
}

/**
 * Wires the popover trigger: owns the colour shared by the swatch and the
 * inline panel, resolves id / disabled / invalid from an enclosing Control,
 * and drives the floating dialog's open state.
 *
 * @returns The colour state (`hsva`, `setHsva`), open state (`open`,
 * `onOpenChange`), Control-derived field metadata (`triggerId`, `describedBy`,
 * `disabled`, `required`, `invalid`), and the Floating UI plumbing
 * (`setReference`, `setFloating`, `floatingStyles`, `getReferenceProps`,
 * `getFloatingProps`, `context`).
 * @remarks
 * `disabled` merges the prop with the enclosing Control's; `setReference`
 * captures the trigger node for `useFloatingUI`'s `returnFocusTo` alongside
 * Floating UI's own reference setter.
 * @internal
 */
export function useColorPickerState({
	value,
	defaultValue,
	format,
	alpha,
	onValueChange,
	onOpenChange,
	placement,
	disabled,
}: ColorPickerStateOptions) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

	const { hsva, setHsva } = useColorState({ value, defaultValue, format, alpha, onValueChange })

	// The single writer: the trigger toggles through it, and floating-ui's dismiss paths
	// are armed only while open, so every set it takes is a real transition and the
	// caller's callback rides the setter with no change guard. `useControllable` is the
	// shape the sibling this picker mirrors uses at the same seam (`DatePicker`).
	const [open = false, setOpen] = useControllable<boolean>({
		defaultValue: false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const triggerRef = useRef<HTMLElement | null>(null)

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		offset: 8,
		role: 'dialog',
		returnFocusTo: triggerRef,
	})

	// Captures the trigger for `useFloatingUI`'s `returnFocusTo`;
	// `FloatingFocusManager` runs with `returnFocus={false}`. Composed through the
	// shared hook rather than by hand, so the panel's own `setReference` never takes
	// a `null` during deletion effects — see {@link useFloatingReference}.
	const setReference = useFloatingReference<HTMLElement>(refs.setReference, triggerRef, undefined)

	return {
		triggerId: scope.id,
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.severity === 'error' || undefined,
		hsva,
		setHsva,
		open,
		onOpenChange: setOpen,
		setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
	}
}
