'use client'

import { useMemo } from 'react'
import { useA11yControl } from '../../hooks'
import { type ControlContextValue, useControl } from './context'

/**
 * Builds the `ControlContext` value for a single-control field wrapper
 * (`CheckboxField` / `RadioField` / `SwitchField`): inherits the parent control
 * cascade and wires the Description / error Message a11y slots off the field id.
 * Centralizing it keeps a new field from silently dropping the
 * `aria-describedby` wiring — the shape is identical across the three.
 */
export function useControlFieldContext(id: string): ControlContextValue {
	const parent = useControl()

	const a11y = useA11yControl(id)

	return useMemo<ControlContextValue>(
		() => ({
			id,
			autoComplete: parent?.autoComplete,
			disabled: parent?.disabled,
			invalid: parent?.invalid,
			readOnly: parent?.readOnly,
			required: parent?.required,
			size: parent?.size,
			variant: parent?.variant,
			...a11y,
		}),
		[id, parent, a11y],
	)
}
