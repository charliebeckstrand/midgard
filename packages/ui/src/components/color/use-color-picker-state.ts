'use client'

import type { FloatingPlacement } from '../../hooks'
import { useControlPickerField } from '../control/use-control-picker-field'
import { useControlPickerPopover } from '../control/use-control-picker-popover'
import type { ColorFormat, Hsva } from './types'
import { useColorState } from './use-color-state'

export type ColorPickerStateOptions = {
	/** Form field name; binds the color to an enclosing `<Form>`. */
	name?: string
	/** The controlled color. `null` keeps the picker controlled with no color (CONVENTIONS §7.3). */
	value?: string | Hsva | null
	defaultValue?: string | Hsva
	format: ColorFormat
	alpha: boolean
	onValueChange?: (value: string | Hsva) => void
	onOpenChange?: (open: boolean) => void
	placement: FloatingPlacement
	disabled?: boolean
	readOnly?: boolean
}

/**
 * Wires the popover trigger: owns the color shared by the swatch and the
 * inline panel. It resolves id / disabled / readOnly / invalid from an enclosing
 * Control, and drives the floating dialog's open state.
 *
 * @returns The color state (`hsva`, `setHsva`), the open state (`open`,
 * `onOpenChange`), and the Control-derived field metadata (`triggerId`,
 * `describedBy`, `disabled`, `readOnly`, `validation`). It also returns the
 * Floating UI plumbing (`dialogId`, `setReference`, `setFloating`,
 * `floatingStyles`, `getReferenceProps`, `getFloatingProps`, `context`).
 * @remarks
 * Binds to an enclosing `<Form>` field by `name` (CONVENTIONS §7.2); the field's
 * own errors reach `validation` beside the Control severity, as
 * `useControlProps` resolves them. An explicit `disabled` or `readOnly` wins
 * over the enclosing Control's. The open setter refuses an open while
 * `readOnly` is on, and a close stays allowed. A close of the panel marks the
 * bound field touched. `onOpenChange` routes through the floating-ui context,
 * as in DatePicker.
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
	readOnly,
}: ColorPickerStateOptions) {
	// The §7.2 binding sits above the color state rather than inside it: a bound
	// field is the value channel, and `useColorState` keeps the HSVA the swatch
	// and the panel share. An emission round-trips through the field and comes
	// back as `value`, which the state's own echo guard then skips.
	const {
		value: current,
		setValue,
		setTouched,
		field,
	} = useControlPickerField<string | Hsva>({
		name,
		value,
		defaultValue,
		// The picker always holds a color — the swatch has to paint something — so
		// the cleared `null` §7.3 admits never reaches the consumer.
		onValueChange: onValueChange && ((next) => next != null && onValueChange(next)),
		disabled,
		readOnly,
	})

	// `useControlPickerField` owns the seed: it gives `defaultValue` when the picker is
	// unbound and uncontrolled, and ignores it for a bound field (§7.2). The
	// color state is always controlled, so an empty value goes in as `null`
	// and paints black.
	const { hsva, setHsva } = useColorState({
		value: current ?? null,
		format,
		alpha,
		onValueChange: setValue,
	})

	// The picker is uncontrolled today, so no `open` prop goes in. The public
	// callback only observes the open state.
	const popover = useControlPickerPopover({
		placement,
		onOpenChange,
		readOnly: field.readOnly,
		setTouched,
	})

	return {
		...field,
		dialogId: popover.dialogId,
		hsva,
		setHsva,
		open: popover.open,
		onOpenChange: popover.onOpenChange,
		setReference: popover.setReference,
		setFloating: popover.refs.setFloating,
		floatingStyles: popover.floatingStyles,
		getReferenceProps: popover.getReferenceProps,
		getFloatingProps: popover.getFloatingProps,
		context: popover.context,
	}
}
