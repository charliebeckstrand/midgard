'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type ReactNode, useId, useLayoutEffect, useRef } from 'react'
import { Toolbar } from '../../components/toolbar'
import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/chat-prompt'
import { useChatPromptToolbarScope } from './context'

/** Props for {@link ChatPromptToolbar}. The root `<div>` takes the rest. */
export type ChatPromptToolbarProps = Omit<ComponentProps<'div'>, 'children'> & {
	/**
	 * A short status of the composer, such as "Editing" or "Writing a reply".
	 * It names the controls, and the textarea takes it as its description.
	 */
	label: ReactNode
	/**
	 * Controls that act on that status, such as a Cancel button. They are a
	 * toolbar at the inline end of the row, and the arrow keys move between them.
	 */
	children?: ReactNode
	/**
	 * Fires on Escape in the textarea, while no picker of the composer is open,
	 * such as to cancel an edit. The press is consumed, so an enclosing dialog
	 * does not close on it.
	 */
	onDismiss?: () => void
}

/**
 * A row above the field of {@link ChatPrompt}: a status label at the inline
 * start, and the controls of that status at the inline end. Give it to the
 * `toolbar` of the prompt, such as for an edit of a sent message or for a
 * reply that streams.
 *
 * @remarks
 * The label is muted, as a hint is. The controls are a `Toolbar` that the
 * label names. The textarea takes the label as its description, so a reader
 * who focuses the field hears the status.
 *
 * A toolbar that unmounts while the focus is in it, such as after a press of
 * its Cancel button, gives the focus to the textarea (WCAG 2.4.3).
 *
 * Outside a `ChatPrompt`, the row renders with no link to a field.
 */
export function ChatPromptToolbar({
	label,
	children,
	onDismiss,
	className,
	ref,
	...props
}: ChatPromptToolbarProps) {
	const scope = useChatPromptToolbarScope()

	const ownId = useId()

	const labelId = scope?.labelId ?? ownId

	const rowRef = useRef<HTMLDivElement>(null)

	// The unmount reads `rowRef`, so a consumer `ref` joins it.
	const setRow = useComposedRefs(rowRef, ref)

	const slots = k()

	// The prompt reads the handler at the press, so the newest one counts.
	useLayoutEffect(() => {
		if (!scope) return

		scope.setDismiss(onDismiss)

		return () => scope.setDismiss(undefined)
	}, [scope, onDismiss])

	// The cleanup of a layout effect runs before React removes the row, so it
	// still finds the focus in it.
	useLayoutEffect(() => {
		if (!scope) return

		const unmount = scope.mount()

		const row = rowRef.current

		return () => {
			unmount()

			if (row?.contains(row.ownerDocument.activeElement)) scope.focusField()
		}
	}, [scope])

	return (
		<div
			data-slot="chat-prompt-toolbar"
			{...props}
			ref={setRow}
			className={cn(slots.toolbar, className)}
		>
			<span id={labelId} data-slot="chat-prompt-toolbar-label" className={slots.toolbarLabel}>
				{label}
			</span>
			{children != null && (
				<Toolbar aria-labelledby={labelId} className={slots.toolbarControls}>
					{children}
				</Toolbar>
			)}
		</div>
	)
}
