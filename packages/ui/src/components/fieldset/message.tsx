'use client'

import { type ComponentPropsWithoutRef, type ReactNode, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { keyByOccurrence } from '../../utilities'
import { useControl } from '../control/context'
import { useFormField } from '../form/context'

/** Tone of a `<Message>`: an assertive `error`, or a polite `warning` / `success`. */
export type MessageSeverity = 'error' | 'warning' | 'success'

/** Props for {@link Message}: `severity`, optional form-field `name` binding, and the `all`-errors flag atop native `<p>` attributes. */
export type MessageProps = {
	severity?: MessageSeverity
	className?: string
	name?: string
	/** When form-bound and the field has multiple errors, render every one as a list. Defaults to the first error only. */
	all?: boolean
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'name'>

/**
 * True when the error severity should auto-render: form-bound with errors, or
 * (unbound) given children. Other severities render their children verbatim.
 *
 * @internal
 */
function shouldRenderError(
	severity: MessageSeverity,
	isFormBoundError: boolean,
	issues: string[] | undefined,
	children: ReactNode,
): boolean {
	if (severity !== 'error') return false

	return isFormBoundError ? (issues?.length ?? 0) > 0 : children != null
}

/**
 * Resolves the element id: explicit `id` wins; otherwise the `error` severity
 * borrows the control's `messageId`, and other severities derive
 * `${control.id}-${severity}`.
 *
 * @internal
 */
function resolveMessageElementId(
	id: string | undefined,
	severity: MessageSeverity,
	control: { id: string; messageId?: string } | null | undefined,
): string | undefined {
	if (id !== undefined) return id

	if (severity === 'error') return control?.messageId

	return control ? `${control.id}-${severity}` : undefined
}

/**
 * Validation or status feedback for a form control. The `error` severity renders
 * `role="alert"`, registers its id into the field's `aria-describedby`, and —
 * when bound to a form field by `name` — auto-renders that field's first error
 * (or every error as a `<ul>` with `all`), suppressing itself when there are
 * none. The `success` severity renders `role="status"` from its children and
 * does not register as a description.
 *
 * @remarks A nested `<Message>` is presentational: it does not mark the control
 * invalid. Drive the validation ring (and, for `error`, `aria-invalid`) with
 * `<Field severity>` / `<Control severity>`, an explicit `invalid`, or a form
 * binding. Resolves type scale from the Density cascade.
 * @defaultValue severity `'error'`
 */
export function Message({
	severity = 'error',
	className,
	id,
	name,
	all,
	children,
	...props
}: MessageProps) {
	const control = useControl()

	const field = useFormField(name)

	const { size } = useDensity()

	// When form-bound, only the error severity auto-renders from the field's errors.
	// Other severities render their children verbatim.
	const isFormBoundError = severity === 'error' && field !== undefined

	const issues = isFormBoundError ? field.errors : undefined

	// Error messages register; aria-describedby references the id only while
	// the message renders. Registration precedes the early return; hook order
	// stays stable. Success messages are not field descriptions and don't register.
	const rendersError = shouldRenderError(severity, isFormBoundError, issues, children)

	const registerMessage = control?.registerMessage

	useEffect(() => {
		if (!rendersError) return

		// The error severity renders `id ?? control.messageId`; register that id.
		// An unregistered custom id orphans the field's aria-describedby.
		return registerMessage?.(id)
	}, [rendersError, registerMessage, id])

	if (isFormBoundError && (!issues || issues.length === 0)) return null

	const elementId = resolveMessageElementId(id, severity, control)

	const classes = cn(k.message({ size, severity }), className)

	// Errors use `role="alert"` (assertive); success feedback uses `role="status"` (polite).
	const role = severity === 'error' ? 'alert' : 'status'

	if (isFormBoundError && issues && all && issues.length > 1) {
		// Text alone can collide as a key; the native validator path doesn't
		// dedupe identical messages. Repeats get an occurrence suffix.
		const keyed = keyByOccurrence(issues)

		return (
			<ul
				data-slot="message"
				data-severity={severity}
				id={elementId}
				role={role}
				className={classes}
			>
				{keyed.map(({ key, value }) => (
					<li key={key}>{value}</li>
				))}
			</ul>
		)
	}

	const content = isFormBoundError && issues ? issues[0] : children

	return (
		<p
			data-slot="message"
			data-severity={severity}
			id={elementId}
			role={role}
			className={classes}
			{...props}
		>
			{content}
		</p>
	)
}
