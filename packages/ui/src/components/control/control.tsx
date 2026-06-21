'use client'

import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yControl } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { Density } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import {
	ControlContext,
	type ControlContextValue,
	type ControlSeverity,
	type ControlSize,
	type ControlVariant,
	useControl,
} from './context'

/** Props for {@link Control}; the shared form-field state broadcast to control-aware descendants. */
export type ControlProps = {
	id?: string
	autoComplete?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	/** Validation / status severity broadcast to control-aware descendants: `error` (also `aria-invalid`), `warning`, or `success`. */
	severity?: ControlSeverity
	size?: ControlSize
	variant?: ControlVariant
	className?: string
	children: ReactNode
}

/**
 * Form-field context provider: generates a stable id and broadcasts
 * `disabled`, `invalid`, `readOnly`, `required`, `severity`, `size`, and
 * `variant` to control-aware descendants (input, textarea, switch, listbox,
 * combobox, datepicker, checkbox, radio). Nests: `disabled` / `readOnly`
 * cascade through inner Controls, `severity` / `size` / `variant` inherit
 * unless overridden. Wraps its subtree in a Density scope when `size` resolves.
 */
export function Control({
	id: idProp,
	autoComplete,
	disabled,
	invalid,
	readOnly,
	required,
	severity,
	size,
	variant,
	className,
	children,
}: ControlProps) {
	const parent = useControl()

	const scope = useIdScope({ id: idProp })

	// disabled/readOnly OR-merge with parent; severity/size/variant inherit unless overridden.
	const mergedDisabled = disabled || parent?.disabled
	const mergedReadOnly = readOnly || parent?.readOnly

	const mergedSeverity = severity ?? parent?.severity

	const mergedSize = size ?? parent?.size

	const mergedVariant = variant ?? parent?.variant

	const mergedAutoComplete = autoComplete ?? parent?.autoComplete

	const a11y = useA11yControl(scope.id)

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: mergedAutoComplete,
			disabled: mergedDisabled,
			invalid,
			readOnly: mergedReadOnly,
			required,
			severity: mergedSeverity,
			size: mergedSize,
			variant: mergedVariant,
			// Spreads the a11y bundle wholesale: label / description / error ids,
			// registrars, and composed labelledBy/describedBy.
			...a11y,
		}),
		[
			scope.id,
			mergedAutoComplete,
			mergedDisabled,
			invalid,
			mergedReadOnly,
			required,
			mergedSeverity,
			mergedSize,
			mergedVariant,
			a11y,
		],
	)

	const body = (
		<div
			data-slot="control"
			{...(mergedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k.field, className)}
		>
			{children}
		</div>
	)

	return (
		<ControlContext value={value}>
			{mergedSize ? <Density scale={mergedSize}>{body}</Density> : body}
		</ControlContext>
	)
}
