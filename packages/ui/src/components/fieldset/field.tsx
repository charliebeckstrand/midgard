'use client'

import { type ComponentPropsWithoutRef, type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yControl } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/fieldset'
import {
	ControlContext,
	type ControlContextValue,
	type ControlSeverity,
	useControl,
} from '../control/context'
import { Message } from './message'

/**
 * Props for {@link Field}: the `htmlFor` id pin, the `autoComplete`/`disabled`
 * control overrides, the `severity`/`message`/`name` validation surface, plus
 * the native `<div>` attributes.
 */
export type FieldProps = {
	autoComplete?: string
	className?: string
	disabled?: boolean
	htmlFor?: string
	/** Validation / status severity broadcast to the nested control (driving its ring and, for `error`, `aria-invalid`) and used as the tone of the auto-`<Message>`. */
	severity?: ControlSeverity
	/** Feedback rendered as a trailing `<Message>` in the `severity` tone (defaults to `error`). Omit and nest `<Message>` for full control — don't combine both. */
	message?: ReactNode
	/** Binds the auto-`<Message>` to a Form field by name: renders that field's first error and suppresses itself when there are none. Ignored when `message` is set. */
	name?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Wraps one form control and its satellites (`<Label>`, `<Description>`,
 * `<Message>`) in a `<div>`, provisioning a `<Control>` context so they share a
 * generated id and `aria-labelledby`/`aria-describedby` wiring. Inherits
 * autoComplete, invalid, readOnly, required, severity, size, and variant from
 * an enclosing Control, and merges `disabled` with the parent's.
 *
 * @remarks Supply `htmlFor` to pin the control id; otherwise one is generated.
 * Set `severity` to drive the control's validation chrome without nesting a
 * `<Message>`; pair it with `message` (controlled) or `name` (form-bound) to
 * auto-render the matching `<Message>` below the control.
 */
export function Field({
	autoComplete,
	className,
	disabled,
	htmlFor,
	severity,
	message,
	name,
	children,
	...props
}: FieldProps) {
	const parent = useControl()

	const scope = useIdScope({ id: htmlFor })

	const a11y = useA11yControl(scope.id)

	const resolvedSeverity = severity ?? parent?.severity

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: autoComplete ?? parent?.autoComplete,
			disabled: disabled || parent?.disabled,
			invalid: parent?.invalid,
			readOnly: parent?.readOnly,
			required: parent?.required,
			severity: resolvedSeverity,
			size: parent?.size,
			variant: parent?.variant,
			...a11y,
		}),
		[scope.id, autoComplete, disabled, parent, resolvedSeverity, a11y],
	)

	// Controlled `message` wins; otherwise a `name` binding renders the form
	// field's error. The error variant's registration drives `aria-invalid`.
	const autoMessage =
		message != null ? (
			<Message variant={resolvedSeverity ?? 'error'}>{message}</Message>
		) : name !== undefined ? (
			<Message name={name} />
		) : null

	return (
		<ControlContext value={value}>
			<div
				data-slot="field"
				{...(disabled || parent?.disabled ? { 'data-disabled': true } : {})}
				className={cn(k.field, className)}
				{...props}
			>
				{children}
				{autoMessage}
			</div>
		</ControlContext>
	)
}
