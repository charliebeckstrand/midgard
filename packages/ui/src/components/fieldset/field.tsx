'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/fieldset'
import { ControlContext, type ControlSeverity } from '../control/context'
import { useControlFieldContext } from '../control/use-control-field-context'

/**
 * Props for {@link Field}: the `htmlFor` id pin, the `autoComplete`/`disabled`
 * control overrides, the `severity` validation surface, plus the native `<div>`
 * attributes.
 */
export type FieldProps = {
	autoComplete?: string
	className?: string
	disabled?: boolean
	htmlFor?: string
	/** Validation / status severity broadcast to the nested control (driving its ring and, for `error`, `aria-invalid`) and used as the tone of a nested `<Message>`. */
	severity?: ControlSeverity
} & Omit<ComponentProps<'div'>, 'className'>

/**
 * Wraps one form control and its satellites (`<Label>`, `<Description>`,
 * `<Message>`) in a `<div>`. The wrapper provisions a `<Control>` context, so they
 * share a generated id and `aria-labelledby`/`aria-describedby` wiring. Inherits
 * autoComplete, readOnly, required, severity, size, and variant from an
 * enclosing Control, and merges `disabled` with the parent's.
 *
 * @remarks Supply `htmlFor` to pin the control id; otherwise one is generated.
 * Set `severity` to drive the control's validation chrome. Nest a `<Message>`
 * (optionally form-bound via its `name`) to render feedback below the control.
 */
export function Field({
	autoComplete,
	className,
	disabled,
	htmlFor,
	severity,
	children,
	...props
}: FieldProps) {
	const scope = useIdScope({ id: htmlFor })

	const value = useControlFieldContext(scope.id, { autoComplete, disabled, severity })

	return (
		<ControlContext value={value}>
			<div
				data-slot="field"
				data-disabled={value.disabled || undefined}
				className={cn(k.field, className)}
				{...props}
			>
				{children}
			</div>
		</ControlContext>
	)
}
