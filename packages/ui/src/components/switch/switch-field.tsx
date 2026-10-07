'use client'

import type { ComponentProps } from 'react'
import { ToggleField } from '../../primitives/toggle'
import { ControlField } from '../control/control-field'

/** Props for {@link SwitchField}: an optional `htmlFor` to pin the shared id, plus `<div>` attributes. */
export type SwitchFieldProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentProps<'div'>, 'className'>

/**
 * Pairs a Switch with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext`; the inner Switch and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function SwitchField({ htmlFor, ...props }: SwitchFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<ToggleField {...props} />
		</ControlField>
	)
}
