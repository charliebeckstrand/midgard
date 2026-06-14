'use client'

import { useMemo } from 'react'
import { useA11yControl } from '../../hooks'
import { type ControlContextValue, useControl } from './context'

/**
 * Builds the `ControlContext` value for a single-control field wrapper
 * (`CheckboxField` / `RadioField` / `SwitchField`): inherits the parent control
 * cascade and spreads the `useA11yControl` bundle (label / description / error
 * slots) off the field id. The shape is identical across all three field types.
 *
 * @param id - The scoped field id the context broadcasts and the a11y slots key off.
 * @returns A memoized {@link ControlContextValue} for {@link ControlField}.
 * @internal Not on the barrel — backs {@link ControlField}.
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
