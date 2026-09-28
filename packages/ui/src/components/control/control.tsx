'use client'

import { type ReactNode, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import type { DensityStep } from '../../core/density'
import { useA11yControl } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/fieldset'
import { Box } from '../../structure/box'
import {
	ControlContext,
	type ControlContextValue,
	type ControlSeverity,
	type ControlVariant,
	useControl,
} from './context'

/** Props for {@link Control}; the shared form-field state broadcast to control-aware descendants. */
export type ControlProps = {
	id?: string
	autoComplete?: string
	disabled?: boolean
	readOnly?: boolean
	required?: boolean
	/** Validation / status severity broadcast to control-aware descendants: `error` (also `aria-invalid`), `warning`, or `success`. Pass `severity="error"` to mark the field invalid. */
	severity?: ControlSeverity
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the field a density scope.
	 */
	size?: DensityStep
	variant?: ControlVariant
	className?: string
	children: ReactNode
}

/**
 * Form-field context provider. It generates a stable id and broadcasts
 * `autoComplete`, `disabled`, `readOnly`, `required`, `severity`, and `variant`
 * to control-aware descendants. Those are input, textarea, switch, listbox,
 * combobox, datepicker, checkbox, and radio. Nests: `disabled` / `readOnly`
 * cascade through inner Controls, and `severity` / `variant` inherit unless
 * overridden. A `size` makes the field a density scope. It is not in the
 * context: each field, and each nested Control, takes the step of its nearest
 * density scope in CSS.
 *
 * @remarks A Control holds one control-aware descendant, because that
 * descendant adopts the one id. To group fields, nest one Control for each
 * field. A presentational sub-part opts out at its call site: it renders under
 * `<ControlContext value={undefined}>` and gets `disabled`, `size` and
 * `variant` explicitly.
 */
export function Control({
	id: idProp,
	autoComplete,
	disabled,
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

	// disabled/readOnly OR-merge with parent; severity/variant inherit unless overridden.
	const mergedDisabled = disabled || parent?.disabled
	const mergedReadOnly = readOnly || parent?.readOnly

	const mergedSeverity = severity ?? parent?.severity

	const mergedVariant = variant ?? parent?.variant

	const mergedAutoComplete = autoComplete ?? parent?.autoComplete

	const a11y = useA11yControl(scope.id)

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: mergedAutoComplete,
			disabled: mergedDisabled,
			readOnly: mergedReadOnly,
			required,
			severity: mergedSeverity,
			variant: mergedVariant,
			// Spreads the a11y bundle wholesale: label / description / error ids,
			// registrars, and composed labelledBy/describedBy.
			...a11y,
		}),
		[
			scope.id,
			mergedAutoComplete,
			mergedDisabled,
			mergedReadOnly,
			required,
			mergedSeverity,
			mergedVariant,
			a11y,
		],
	)

	return (
		<ControlContext value={value}>
			<Box
				data-slot="control"
				density={size}
				data-disabled={dataAttr(mergedDisabled)}
				className={cn(k.field, className)}
			>
				{children}
			</Box>
		</ControlContext>
	)
}
