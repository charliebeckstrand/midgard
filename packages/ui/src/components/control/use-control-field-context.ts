'use client'

import { useMemo } from 'react'
import { type ControlContextValue, useControl } from './context'
import { useControlA11y } from './use-control-a11y'

/**
 * Builds the `ControlContext` value for a single-control field wrapper
 * (`CheckboxField` / `RadioField` / `SwitchField`): inherits the parent control
 * cascade and wires the Description / error Message a11y slots off the field id.
 * Centralizing it keeps a new field from silently dropping the
 * `aria-describedby` wiring — the shape is identical across the three.
 */
export function useControlFieldContext(id: string): ControlContextValue {
	const parent = useControl()

	const a11y = useControlA11y(id)

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
			describedBy: a11y.describedBy,
			descriptionId: a11y.descriptionId,
			messageId: a11y.messageId,
			registerDescription: a11y.registerDescription,
			registerMessage: a11y.registerMessage,
		}),
		[
			id,
			parent,
			a11y.describedBy,
			a11y.descriptionId,
			a11y.messageId,
			a11y.registerDescription,
			a11y.registerMessage,
		],
	)
}
