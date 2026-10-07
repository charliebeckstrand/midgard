'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useRef,
} from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { FloatingSurface, type FloatingSurfaceProps } from '../../primitives/floating-surface'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { useGlass } from '../../providers/glass/context'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import { Box } from '../../structure/box'
import { RECLAIM_KEYS } from './use-date-picker-keyboard'

/** Props for {@link DatePickerContent}. @internal */
type DatePickerContentProps = {
	/** The dialog id, which the trigger names in `aria-controls`. */
	id?: string
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: FloatingSurfaceProps['getFloatingProps']
	context: FloatingRootContext
	/**
	 * The density step of `<DatePicker>`. Omit it to take the step of the
	 * nearest density scope of the picker, which the portal carries. A step
	 * makes the panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * The picker's virtual-focus key handler (zones + active highlight). It
	 * lives on the trigger and, via this prop, on the dialog itself. Initial
	 * focus lands on the dialog, not its first tabbable button. The model
	 * keeps working once a real browser moves focus into the modal trap.
	 *
	 * Presence is the contract: passing a handler declares that the dialog owns
	 * navigation keys, so the shell reclaims DOM focus on them. Omit it for a
	 * variant whose content owns its own keyboard (the relative custom range's
	 * editable fields), and the shell leaves focus alone.
	 */
	onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
	/**
	 * Elements spared from the modal trap's outside marking. While open,
	 * `FloatingFocusManager` stamps `aria-hidden` on everything outside the
	 * floating element — including the reference. `input` mode passes its
	 * reference group here so the DateInput being edited stays visible to AT;
	 * the rest of the page remains hidden.
	 */
	getInsideElements?: () => Element[]
	/**
	 * Element to seed DOM focus on when the dialog opens. Defaults to the dialog
	 * container for the virtual-highlight model. `input` mode passes the editable
	 * DateInput so focus lands there. The user can type, and the same keydown
	 * stream roves the grid through the input's `aria-activedescendant`. The input
	 * sits inside the reference (`getInsideElements`), so the modal focus manager
	 * treats it as related and does not self-close.
	 */
	initialFocusRef?: RefObject<HTMLElement | null>
	onExitComplete?: () => void
	/**
	 * Accessible name for the dialog.
	 *
	 * @defaultValue 'Choose date'
	 */
	label?: string
	children: ReactNode
}

/**
 * Portaled, animated modal dialog shell for the picker popover. It wires
 * `FloatingFocusManager`, and it seeds focus on the dialog container (not its
 * first tabbable) for the virtual-highlight model. An explicit `size` makes
 * the panel a density scope.
 *
 * @remarks
 * On a navigation key from a control in the dialog, the dialog's `onKeyDown`
 * gives DOM focus back to the seed of the open focus: the container, or the
 * input in `input` mode. A grid move that re-anchors the month therefore cannot
 * drop focus to `<body>`. Portaled descendants (the month/year picker) own
 * their own keyboard.
 *
 * @internal
 */
export function DatePickerContent({
	id,
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	context,
	size,
	onKeyDown,
	getInsideElements,
	initialFocusRef,
	onExitComplete,
	label = 'Choose date',
	children,
}: DatePickerContentProps) {
	const glass = useGlass()

	// Focus lands on the dialog container (tabIndex -1) instead of floating-ui's
	// default, the first tabbable, i.e. the "Previous month" button. The picker
	// uses a virtual highlight; seeding DOM focus on a button both misleads AT
	// and orphans the arrow-key model. `input` mode overrides this with the
	// editable DateInput via `initialFocusRef`.
	const dialogRef = useRef<HTMLDivElement | null>(null)

	const focusRef = initialFocusRef ?? dialogRef

	// `FloatingSurface` composes this through floating-ui, so the handlers of the
	// engine merge with it.
	const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// No handler: this content owns its own keyboard (see the
		// `onKeyDown` prop doc) — skip the routing guards and the
		// focus reclaim, which would steal from the field typed in.
		if (!onKeyDown) return

		// Keys from portaled descendants (the month/year picker
		// popover) bubble here through the React tree, not the
		// DOM. That surface owns its keyboard; acting here would
		// drive the calendar underneath it.
		if (event.target instanceof Node && !event.currentTarget.contains(event.target)) return

		// Activation keys on a DOM-focused control (the user Tabbed
		// to a header/footer button) belong to that control; only
		// the dialog itself routes them to the virtual model.
		if ((event.key === 'Enter' || event.key === ' ') && event.target !== event.currentTarget) return

		// Navigation keys belong to the virtual model even when the
		// user has Tabbed onto a control inside. Give focus back to
		// the seed of the open focus first: the dialog, or the input
		// in `input` mode. A grid move can re-anchor the month and
		// unmount the focused day button, which drops focus to <body>.
		if (RECLAIM_KEYS.has(event.key) && event.target !== event.currentTarget) {
			const seed = focusRef.current ?? event.currentTarget

			seed.focus()
		}

		onKeyDown(event)
	}

	return (
		// `returnFocus={false}` in the surface: `useFloatingUI`'s `returnFocusTo` restores
		// focus on Escape or selection, but not on an outside press, where focus follows
		// the pointer.
		<FloatingSurface
			open={open}
			density={size}
			onExitComplete={onExitComplete}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			trapFocusContext={context}
			trapFocusProps={{ initialFocus: focusRef, getInsideElements }}
			ref={dialogRef}
			id={id}
			role="dialog"
			aria-modal="true"
			aria-label={label}
			className={cn(k.content.portal)}
			tabIndex={-1}
			onKeyDown={handleDialogKeyDown}
		>
			<m.div
				{...k.content.motion}
				data-slot="datepicker-content"
				className={cn('z-50', k.content.column, k.content.text, glass && k.content.glass)}
				onMouseDown={(event) => event.preventDefault()}
			>
				<Box
					bg={glass ? 'none' : 'popover'}
					outline={glass || undefined}
					radius="lg"
					className={cn(k.content.body)}
				>
					{children}
				</Box>
			</m.div>
		</FloatingSurface>
	)
}
