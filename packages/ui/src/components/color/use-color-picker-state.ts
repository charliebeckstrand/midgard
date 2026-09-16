'use client'

import type { Placement } from '@floating-ui/react'
import { useRef } from 'react'
import { useControllable, useFloatingUI } from '../../hooks'
import { useFloatingReference } from '../../hooks/use-floating-reference'
import { useIdScope } from '../../hooks/use-id-scope'
import { useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import type { ColorFormat, Hsva } from './types'
import { useColorState } from './use-color-state'

export type ColorPickerStateOptions = {
	/** Form field name; binds the colour to an enclosing `<Form>`. */
	name?: string
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
 * inline panel. It resolves id / disabled / invalid from an enclosing Control,
 * and drives the floating dialog's open state.
 *
 * @returns The colour state (`hsva`, `setHsva`), the open state (`open`,
 * `onOpenChange`), and the Control-derived field metadata (`triggerId`,
 * `describedBy`, `disabled`, `required`, `invalid`). It also returns the
 * Floating UI plumbing (`setReference`, `setFloating`, `floatingStyles`,
 * `getReferenceProps`, `getFloatingProps`, `context`).
 * @remarks
 * Binds to an enclosing `<Form>` field by `name` (CONVENTIONS §7.2); the field's
 * own errors reach `invalid` beside the ambient `error` severity.
 * `disabled` merges the prop with the enclosing Control's; `setReference`
 * captures the trigger node for `useFloatingUI`'s `returnFocusTo` alongside
 * Floating UI's own reference setter.
 * @internal
 */
export function useColorPickerState({
	name,
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

	// The §7.2 binding sits above the colour state rather than inside it: a bound
	// field is the value channel, and `useColorState` keeps the HSVA the swatch
	// and the panel share. An emission round-trips through the field and comes
	// back as `value`, which the state's own echo guard then skips.
	const bound = useFormValue<string | Hsva>(name, {
		value,
		defaultValue,
		// The picker always holds a colour — the swatch has to paint something — so
		// the cleared `null` §7.3 admits never reaches the consumer.
		onValueChange: onValueChange && ((next) => next != null && onValueChange(next)),
	})

	const { hsva, setHsva } = useColorState({
		value: bound.value,
		defaultValue,
		format,
		alpha,
		onValueChange: bound.setValue,
	})

	// The single writer: the trigger toggles through it, and floating-ui's dismiss paths
	// are armed only while open, so every set it takes is a real transition and the
	// caller's callback rides the setter with no change guard. `useControllable` rather
	// than bare state for the seam, not the machinery — the picker is uncontrolled today,
	// and this is where an `open` prop slots in without moving the report.
	const [open = false, setOpenValue] = useControllable<boolean>({
		defaultValue: false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	// Narrowed on the way out: the controllable setter also takes `null` and a functional
	// updater, and neither belongs in the boolean `onOpenChange` this hook publishes.
	const setOpen: (next: boolean) => void = setOpenValue

	const triggerRef = useRef<HTMLElement | null>(null)

	// The trigger button (`aria-haspopup="dialog"`, `aria-expanded`) and the panel
	// (`role="dialog"`) carry their own roles; `role: null` suppresses floating-ui's
	// `useRole`, which stamps a second dialog widget onto the roleless positioning
	// wrapper that takes `getReferenceProps()`.
	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		offset: 8,
		role: null,
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
		invalid: bound.invalid || control?.severity === 'error' || undefined,
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
