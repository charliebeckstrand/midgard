'use client'

import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useIdScope } from '../../hooks/use-id-scope'
import type { scale } from '../../recipes/kata/control'
import { k } from '../../recipes/kata/fieldset'
import { Box } from '../../structure/box'
import { ControlContext, type ControlSeverity, type ControlVariant } from './context'
import { useControlFieldContext } from './use-control-field-context'

/** Props for {@link Control}; the shared form-field state broadcast to control-aware descendants. */
export type ControlProps = {
	id?: string
	autoComplete?: string
	/** @defaultValue `false`, or `true` inside a disabled Control or Field. */
	disabled?: boolean
	/** @defaultValue `false`, or `true` inside a read-only Control. */
	readOnly?: boolean
	/** @defaultValue `false`, or the state of the enclosing Control. */
	required?: boolean
	/**
	 * Validation / status severity broadcast to control-aware descendants: `error` (also `aria-invalid`), `warning`, or `success`. Pass `severity="error"` to mark the field invalid.
	 * @defaultValue No severity: the field shows no validation ring. An enclosing Control or Field can set one.
	 */
	severity?: ControlSeverity
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the field a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** @defaultValue `'default'`, or the `variant` of the enclosing Control, or the glass surface in a GlassProvider. */
	variant?: ControlVariant
	className?: string
	children: ReactNode
}

/**
 * Form-field context provider. It generates a stable id and broadcasts
 * `autoComplete`, `disabled`, `readOnly`, `required`, `severity`, and `variant`
 * to control-aware descendants. Those are input, textarea, switch, listbox,
 * combobox, datepicker, checkbox, and radio. Nests: `disabled` / `readOnly`
 * cascade through inner Controls, and `required` / `severity` / `variant`
 * inherit unless overridden. A `size` makes the field a density scope. It is
 * not in the context: each field, and each nested Control, takes the step of its nearest
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
	const scope = useIdScope({ id: idProp })

	// disabled/readOnly OR-merge with parent; the other props inherit unless set.
	const value = useControlFieldContext(scope.id, {
		autoComplete,
		disabled,
		readOnly,
		required,
		severity,
		variant,
	})

	return (
		<ControlContext value={value}>
			<Box
				data-slot="control"
				density={size}
				data-disabled={dataAttr(value.disabled)}
				className={cn(k.field, className)}
			>
				{children}
			</Box>
		</ControlContext>
	)
}
