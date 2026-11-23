'use client'

import { type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '../../core/cn'
import type { Severity } from '../../core/validation-attrs'
import { useAnnounceOnAppear } from '../../hooks/a11y/use-announce-on-appear'
import { useFormField } from '../../primitives/form/context'
import { hasIssues } from '../../primitives/form/form-issues'
import { k } from '../../recipes/kata/fieldset'
import { keyByOccurrence } from '../../utilities/key-by-occurrence'
import { useControl } from '../control/context'
import { useControlTarget } from '../control/use-control-target'

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
	 * Renders every error of a form-bound field as a list, when it has more than one. Defaults to the first error only.
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
function resolveElementId(
	id: string | undefined,
	severity: MessageSeverity,
	control: { id: string; messageId?: string } | null | undefined,
): string | undefined {
	if (id !== undefined) return id

	if (severity === 'error') return control?.messageId

	return control ? `${control.id}-${severity}` : undefined
}

/**
 * Validation or status feedback for a form control. The `error` severity
 * registers its id into the field's `aria-describedby`. Bound to a form field by
 * `name`, it auto-renders that field's first error, or every error as a `<ul>`
 * inside a `<div>` with `all`. It suppresses itself when there are none. The
 * `warning` severity renders its children and also registers into
 * `aria-describedby`, because it tells about the value of the field. The
 * `success` severity renders its children and does not register as a
 * description.
 *
 * @remarks Only a message with no form binding is a live region. An `error`
 * message renders `role="alert"`, because the app decides when it appears. A
 * `warning` or `success` message renders `role="status"`. A screen reader can
 * miss a status region that mounts together with its text (WCAG 4.1.3). Thus a
 * polite message that mounts after the first commit of its `<Field>` or
 * `<Control>` also sends its text to the shared announcer, as an `Alert` does.
 *
 * A form-bound message is not a live region. Its id stays in the
 * `aria-describedby` of the control, and the control keeps `aria-invalid`. A
 * refused submit moves the focus to the first invalid control or to a
 * `FormErrorSummary`, and the screen reader then speaks the error. Thus a
 * submit does not start many alerts together, and a keystroke that changes the
 * error does not interrupt the reader. The trade-off: an error that appears on
 * blur is spoken only when the reader goes back to the field or submits.
 *
 * @remarks A nested `<Message>` is presentational: it does not mark the control
 * invalid. Drive the validation ring (and, for `error`, `aria-invalid`) with
 * `<Field severity>` / `<Control severity>`, an explicit `invalid`, or a form
 * binding. Its type scale takes the step of the nearest density scope.
 *
 * A form-bound message registers the id of its control with the form. A
 * `FormErrorSummary` then links the errors of the field to that control.
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

	const ref = useRef<HTMLParagraphElement>(null)

	// Read once, when the message mounts: whether its field mounted before it.
	const [mountedAfterField] = useState(() => control?.isMounted?.() ?? false)

	const field = useFormField(name)

	// A form-bound message names the control of its field, so that a
	// FormErrorSummary can move the focus to that control. A control that passes
	// its name to useControlProps registers the same id, and the registry counts
	// both.
	useControlTarget(field ? name : undefined, control?.id)

	// An unbound message takes the tone of its Field (FieldProps.severity). A
	// form-bound message shows the errors of its field, so it stays `error`.
	const inheritedSeverity = field === undefined ? control?.severity : undefined

	const severity = severityProp ?? inheritedSeverity ?? 'error'

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

	const elementId = resolveElementId(id, severity, control)

	// Only a message with no form binding is a live region. A form-bound message
	// is a description, and the focus move of a refused submit speaks it.
	const live = field === undefined

	const polite = live && severity !== 'error'

	// A screen reader can miss `role="status"` when the region and its text mount
	// together, so a polite message that mounts after its field mirrors its text
	// through the announcer (WCAG 4.1.3), as an Alert does.
	useAnnounceOnAppear(ref, true, { onMount: mountedAfterField, enabled: polite })

	const registerMessage = control?.registerMessage

	useEffect(() => {
		if (!describesField) return

		// Register the id that the message renders. An unregistered custom id
		// orphans the aria-describedby of the field.
		return registerMessage?.(elementId)
	}, [describesField, registerMessage, elementId])

	// The error severity renders only when it has something to say (form-bound
	// with issues, or unbound with children); an empty one would leave a stray
	// element. `rendersError` already encodes that; warning/success always
	// render their children.
	if (severity === 'error' && !rendersError) return null

	const classes = cn(k({ severity }).message, className)

	// An unbound error uses `role="alert"` (assertive); a warning or a success
	// uses `role="status"` (polite). A form-bound message has no live role.
	const liveRole = severity === 'error' ? 'alert' : 'status'

	const role = live ? liveRole : undefined

	if (isFormBoundError && issues && all && issues.length > 1) {
		// Text alone can collide as a key; the native validator path doesn't
		// dedupe identical messages. Repeats get an occurrence suffix.
		const keyed = keyByOccurrence(issues)

		// The `<div>` holds the id and the classes, and a plain `<ul>` inside it
		// keeps the list. This branch is always form-bound, so it has no live role.
		return (
			<div
				data-severity={severity}
				id={elementId}
				className={classes}
				// Consumer props spread first; the anchor and the role below take
				// precedence.
				{...props}
				data-slot="message"
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
			ref={ref}
			data-severity={severity}
			id={elementId}
			className={classes}
			// Consumer props spread first; the anchor and the role below take
			// precedence.
			{...props}
			data-slot="message"
			role={role}
		>
			{content}
		</p>
	)
}
