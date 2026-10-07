'use client'

import type { ComponentProps } from 'react'
import { ToggleField } from '../../primitives/toggle'
import { ControlField } from '../control/control-field'

/** Props for {@link CheckboxField}. */
export type CheckboxFieldProps = {
	/** Pins the generated control id instead of auto-generating one. */
	htmlFor?: string
} & ComponentProps<'div'>

/**
 * Pairs a Checkbox with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext`; the inner Checkbox and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function CheckboxField({ htmlFor, ...props }: CheckboxFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<ToggleField {...props} />
		</ControlField>
	)
}
