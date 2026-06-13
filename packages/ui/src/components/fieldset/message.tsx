'use client'

import { type ComponentPropsWithoutRef, type ReactNode, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { keyByOccurrence } from '../../utilities'
import { useControl } from '../control/context'
import { useFormField } from '../form/context'

/** Tone of a `<Message>`: an assertive `error` or a polite `success`. */
export type MessageVariant = 'error' | 'success'

/** Props for {@link Message}: `variant`, optional form-field `name` binding, and the `all`-errors flag atop native `<p>` attributes. */
export type MessageProps = {
	variant?: MessageVariant
	className?: string
	name?: string
	/** When form-bound and the field has multiple errors, render every one as a list. Defaults to the first error only. */
	all?: boolean
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'name'>

/**
 * True when the error variant should auto-render: form-bound with errors, or
 * (unbound) given children. Other variants render their children verbatim.
 *
 * @internal
 */
function shouldRenderError(
	variant: MessageVariant,
	isFormBoundError: boolean,
	issues: string[] | undefined,
	children: ReactNode,
): boolean {
	if (variant !== 'error') return false

	return isFormBoundError ? (issues?.length ?? 0) > 0 : children != null
}

/**
 * Resolves the element id: explicit `id` wins; otherwise the error variant
 * borrows the control's `messageId`, and other variants derive
 * `${control.id}-${variant}`.
 *
 * @internal
 */
function resolveMessageElementId(
	id: string | undefined,
	variant: MessageVariant,
	control: { id: string; messageId?: string } | null | undefined,
): string | undefined {
	if (id !== undefined) return id

	if (variant === 'error') return control?.messageId

	return control ? `${control.id}-${variant}` : undefined
}

/**
 * Validation or status feedback for a form control. The `error` variant renders
 * `role="alert"`, registers its id into the field's `aria-describedby`, and —
 * when bound to a form field by `name` — auto-renders that field's first error
 * (or every error as a `<ul>` with `all`), suppressing itself when there are
 * none. The `success` variant renders `role="status"` from its children and
 * does not register as a description.
 *
 * @remarks Resolves type scale from the Density cascade.
 * @defaultValue variant `'error'`
 */
export function Message({
	variant = 'error',
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

	// When form-bound, only the error variant auto-renders from the field's errors.
	// Other variants render their children verbatim.
	const isFormBoundError = variant === 'error' && field !== undefined

	const issues = isFormBoundError ? field.errors : undefined

	// Error messages register; aria-describedby references the id only while
	// the message renders. Registration precedes the early return; hook order
	// stays stable. Success messages are not field descriptions and don't register.
	const rendersError = shouldRenderError(variant, isFormBoundError, issues, children)

	const registerMessage = control?.registerMessage

	useEffect(() => {
		if (!rendersError) return

		// The error variant renders `id ?? control.messageId`; register that id.
		// An unregistered custom id orphans the field's aria-describedby.
		return registerMessage?.(id)
	}, [rendersError, registerMessage, id])

	if (isFormBoundError && (!issues || issues.length === 0)) return null

	const elementId = resolveMessageElementId(id, variant, control)

	const className_ = cn(k.message({ size, variant }), className)

	// Errors use `role="alert"` (assertive); success feedback uses `role="status"` (polite).
	const role = variant === 'error' ? 'alert' : 'status'

	if (isFormBoundError && issues && all && issues.length > 1) {
		// Text alone can collide as a key; the native validator path doesn't
		// dedupe identical messages. Repeats get an occurrence suffix.
		const keyed = keyByOccurrence(issues)

		return (
			<ul
				data-slot="message"
				data-variant={variant}
				id={elementId}
				role={role}
				className={className_}
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
			data-variant={variant}
			id={elementId}
			role={role}
			className={className_}
			{...props}
		>
			{content}
		</p>
	)
}
