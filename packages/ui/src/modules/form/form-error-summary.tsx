'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Alert } from '../../components/alert'
import { cn } from '../../core'
import {
	useFormErrors,
	useFormFailures,
	useFormFieldTargets,
	useFormResets,
} from '../../primitives/form/context'
import { k as linkK } from '../../recipes/kata/link'
import { summarizeErrors } from './engine/form-error-summary'

/** Props for {@link FormErrorSummary}: the `title` of the summary, atop the native attributes of its `<div>`. */
export type FormErrorSummaryProps = Omit<ComponentProps<'div'>, 'title' | 'color' | 'children'> & {
	/**
	 * The heading of the summary.
	 * @defaultValue 'There is a problem'
	 */
	title?: ReactNode
}

const DEFAULT_TITLE = 'There is a problem'

/** An element that takes the focus from a script or from the Tab key. */
const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]'

/**
 * Moves the focus to a control by its id. The link keeps its `href`, so the
 * target stays readable, but the page does not jump or change its URL.
 *
 * @remarks Some controls put the id of their field on a wrapper, such as the
 * row of a `Rating`. When the element with the id does not take the focus, the
 * first element in it that can take the focus does.
 * @internal
 */
function focusControl(event: MouseEvent<HTMLAnchorElement>, id: string): void {
	event.preventDefault()

	const doc = event.currentTarget.ownerDocument

	const target = doc.getElementById(id)

	if (!target) return

	target.focus()

	if (doc.activeElement === target) return

	target.querySelector<HTMLElement>(FOCUSABLE)?.focus()
}

/**
 * Lists the errors of the enclosing `Form` after a submit fails, and takes the
 * focus. Each row links to the control of its field.
 *
 * @remarks
 * A refused submit fails, and so does a handler that returns a field issue.
 * After a failure, the summary shows each field that has an issue, with the
 * first issue of the field. A row goes when its field becomes valid, and the
 * summary goes with the last row. A reset closes the summary until the next
 * failure.
 *
 * A row links to the control of its field. A control that binds the field
 * registers its id, and so does a form-bound `Message`. A click moves the focus
 * to that control. A row whose field has no registered control shows the issue
 * as text. Write each issue so that it is clear without its field, such as
 * "Enter an email address".
 *
 * The summary is an error `Alert`, so it announces itself. It also takes the
 * focus after each failure, so the reader starts from it. An `onInvalidSubmit`
 * that moves the focus runs after it, and wins.
 */
export function FormErrorSummary({
	title = DEFAULT_TITLE,
	ref,
	className,
	...props
}: FormErrorSummaryProps) {
	const errors = useFormErrors()

	const targets = useFormFieldTargets()

	const failures = useFormFailures()

	const resets = useFormResets()

	// A failure opens the summary, and a reset closes it. The counts change in
	// render, so the state follows them in render.
	const [open, setOpen] = useState(false)

	const [seen, setSeen] = useState({ failures, resets })

	if (failures !== seen.failures || resets !== seen.resets) {
		setSeen({ failures, resets })

		// When both change in one render, the failure came last.
		setOpen(failures !== seen.failures)
	}

	const rootRef = useRef<HTMLDivElement>(null)

	const setRoot = useComposedRefs(rootRef, ref)

	const items = summarizeErrors(errors)

	const visible = open && items.length > 0

	const seenFailures = useRef(failures)

	const focusPending = useRef(false)

	// Each failure moves the focus to the summary, after the commit that shows
	// it. The store publishes the errors one commit after the failure count, so
	// the focus waits for the summary to show. A reset drops a focus that waits.
	useLayoutEffect(() => {
		if (seenFailures.current !== failures) {
			seenFailures.current = failures

			focusPending.current = true
		}

		if (!open) focusPending.current = false

		if (!visible || !focusPending.current) return

		focusPending.current = false

		rootRef.current?.focus()
	}, [failures, open, visible])

	if (!visible) return null

	return (
		<Alert
			data-slot="form-error-summary"
			severity="error"
			title={title}
			className={className}
			{...props}
			ref={setRoot}
			tabIndex={-1}
		>
			<ul>
				{items.map(({ name, issue }) => {
					const id = targets[name]

					return (
						<li key={name}>
							{id === undefined ? (
								issue
							) : (
								<a
									href={`#${id}`}
									className={cn(linkK({ underline: true }))}
									onClick={(event) => focusControl(event, id)}
								>
									{issue}
								</a>
							)}
						</li>
					)
				})}
			</ul>
		</Alert>
	)
}
