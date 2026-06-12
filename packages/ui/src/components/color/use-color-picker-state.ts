'use client'

import type { Placement } from '@floating-ui/react'
import { useCallback, useRef, useState } from 'react'
import { useFloatingUI } from '../../hooks'
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
	placement: Placement
	disabled: boolean
}

/**
 * Wires the popover trigger: owns the color shared by the swatch and the
 * inline panel, resolves id / disabled / invalid from an enclosing Control,
 * and drives the floating dialog's open state.
 */
export function useColorPickerState({
	value,
	defaultValue,
	format,
	alpha,
	onValueChange,
	placement,
	disabled,
}: ColorPickerStateOptions) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

	const { hsva, setHsva } = useColorState({ value, defaultValue, format, alpha, onValueChange })

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLElement | null>(null)

	const onOpenChange = useCallback((next: boolean) => setOpen(next), [])

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange,
		offset: 8,
		role: 'dialog',
		returnFocusTo: triggerRef,
	})

	// Captures the trigger for `useFloatingUI`'s `returnFocusTo`;
	// `FloatingFocusManager` runs with `returnFocus={false}`.
	const setReference = useCallback(
		(node: HTMLElement | null) => {
			triggerRef.current = node

			refs.setReference(node)
		},
		[refs],
	)

	return {
		triggerId: scope.id,
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.invalid,
		hsva,
		setHsva,
		open,
		onOpenChange,
		setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
	}
}
