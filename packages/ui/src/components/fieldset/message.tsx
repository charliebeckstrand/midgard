'use client'

import { type HTMLAttributes, type ReactNode, useEffect } from 'react'
import { cn, type Severity } from '../../core'
import { k } from '../../recipes/kata/fieldset'
import { keyByOccurrence } from '../../utilities'
import { useControl } from '../control/context'
import { useFormField } from '../form/context'
import { hasIssues } from '../form/form-reducer'

/** Tone of a `<Message>`: an assertive `error`, or a polite `warning` / `success`. Aliases the shared {@link Severity} so the validation vocabulary stays single-sourced. */
export type MessageSeverity = Severity

/** Props for {@link Message}: `severity`, optional form-field `name` binding, and the `all`-errors flag atop the native attributes of the `<p>` or the `<div>` that it renders. */
export type MessageProps = {
	/**
	 * The tone of the message. Only `error` renders the errors of a bound field.
	 * When you do not set it, an unbound message takes the `severity` of the
	 * enclosing `<Field>` or `<Control>`. A form-bound message stays `error`.
	 * @defaultValue `'error'`, or the `severity` of the enclosing Field or Control when the message has no form binding.
	 */
	severity?: MessageSeverity
	className?: string
	name?: string
	/**
	 * When form-bound and the field has multiple errors, render every one as a list. Defaults to the first error only.
	 * @defaultValue false
	 */
	all?: boolean
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'name'>

/**
 * True when the error severity auto-renders: form-bound with errors, or
 * (unbound) given children that show text. `null`, `undefined`, `false`,
 * `true`, and `''` show no text, so they do not render. `0` shows "0", so it
 * renders. Other severities render their children verbatim.
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

	if (isFormBoundError) return hasIssues(issues)

	return children != null && typeof children !== 'boolean' && children !== ''
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
 * `role="alert"` and registers its id into the field's `aria-describedby`. Bound
 * to a form field by `name`, it auto-renders that field's first error, or every
 * error as a `<ul>` inside a live-region `<div>` with `all`. It suppresses itself
 * when there are none. The `warning` severity renders `role="status"` from its
 * children and also registers into `aria-describedby`, because it tells about
 * the value of the field. The `success` severity renders `role="status"` from
 * its children and does not register as a description.
 *
 * @remarks A nested `<Message>` is presentational: it does not mark the control
 * invalid. Drive the validation ring (and, for `error`, `aria-invalid`) with
 * `<Field severity>` / `<Control severity>`, an explicit `invalid`, or a form
 * binding. Its type scale takes the step of the nearest density scope.
 */
export function Message({
	severity: severityProp,
	className,
	id,
	name,
	all,
	children,
	...props
}: MessageProps) {
	const control = useControl()

	const field = useFormField(name)

	// An unbound message takes the tone of its Field (FieldProps.severity). A
	// form-bound message shows the errors of its field, so it stays `error`.
	const severity = severityProp ?? (field === undefined ? control?.severity : undefined) ?? 'error'

	// When form-bound, only the error severity auto-renders from the field's errors.
	// Other severities render their children verbatim.
	const isFormBoundError = severity === 'error' && field !== undefined

	const issues = isFormBoundError ? field.errors : undefined

	// An error or warning message describes the field, so it registers;
	// aria-describedby references the id only while the message renders.
	// Registration precedes the early return, so the hook order is stable. A
	// success message is feedback, not a description, so it does not register.
	const rendersError = shouldRenderError(severity, isFormBoundError, issues, children)

	const describesField = rendersError || severity === 'warning'

	const elementId = resolveMessageElementId(id, severity, control)

	const registerMessage = control?.registerMessage

	useEffect(() => {
		if (!describesField) return

		// Register the id that the message renders. An unregistered custom id
		// orphans the aria-describedby of the field.
		return registerMessage?.(elementId)
	}, [describesField, registerMessage, elementId])

	// The error severity renders only when it has something to say (form-bound
	// with issues, or unbound with children); an empty one would leave a stray
	// `role="alert"`. `rendersError` already encodes that; warning/success always
	// render their children.
	if (severity === 'error' && !rendersError) return null

	const classes = cn(k.message({ severity }), className)

	// Errors use `role="alert"` (assertive); success feedback uses `role="status"` (polite).
	const role = severity === 'error' ? 'alert' : 'status'

	if (isFormBoundError && issues && all && issues.length > 1) {
		// Text alone can collide as a key; the native validator path doesn't
		// dedupe identical messages. Repeats get an occurrence suffix.
		const keyed = keyByOccurrence(issues)

		// ARIA in HTML does not allow `alert` or `status` on a `<ul>`, and the
		// role removes the list semantics of the items. The live region is a
		// `<div>`, and a plain `<ul>` inside it keeps the list.
		return (
			<div
				data-slot="message"
				data-severity={severity}
				id={elementId}
				className={classes}
				// Consumer props spread first; the live-region role below takes
				// precedence.
				{...props}
				role={role}
			>
				<ul>
					{keyed.map(({ key, value }) => (
						<li key={key}>{value}</li>
					))}
				</ul>
			</div>
		)
	}

	const content = isFormBoundError && issues ? issues[0] : children

	return (
		<p
			data-slot="message"
			data-severity={severity}
			id={elementId}
			className={classes}
			// Consumer props spread first; the live-region role below takes
			// precedence.
			{...props}
			role={role}
		>
			{content}
		</p>
	)
}
