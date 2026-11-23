'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import {
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useRef,
} from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { FloatingSurface, type FloatingSurfaceProps } from '../../primitives/floating-surface'
import { useGlass } from '../../primitives/glass/context'
import { useIntl } from '../../primitives/intl/use-intl'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import { Box } from '../../structure/box'
import { isActivationKey } from '../../utilities/keyboard-navigation'
import { Drawer, DrawerBody, DrawerClose, DrawerHeader, DrawerPanel, DrawerTitle } from '../drawer'
import { datePickerMessages } from './date-picker-messages'
import { RECLAIM_KEYS } from './use-date-picker-keyboard'

/**
 * The part of the state of a {@link DatePicker} variant that {@link DatePickerContent}
 * reads. Each variant state hook returns it, so a variant passes its state whole.
 *
 * @internal
 */
export type DatePickerContentState = {
	/** The dialog id, which the trigger names in `aria-controls`. */
	dialogId?: string
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: FloatingSurfaceProps['getFloatingProps']
	context: FloatingRootContext
	/**
	 * The element that gets focus when the panel closes: the field in `input`
	 * mode, else the trigger. The sheet returns the focus to it. Without it, the
	 * focus manager of the sheet returns the focus to the last element that it
	 * recorded, which can be an unrelated control.
	 */
	returnFocusRef?: RefObject<HTMLElement | null>
	/**
	 * Fires when the popover has finished its exit. The sheet does not report
	 * it. Each variant also resets its draft on the next open.
	 */
	onExitComplete?: () => void
}

/** Props for {@link DatePickerContent}. @internal */
type DatePickerContentProps = {
	/** The state of the variant. */
	state: DatePickerContentState
	/**
	 * The density step of `<DatePicker>`. Omit it to take the step of the
	 * nearest density scope of the picker, which the portal carries. A step
	 * makes the panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * The key handler of a picker that steers a highlight (zones + active
	 * highlight) while DOM focus stays in its text field: the `input` popover.
	 * It lives on the field and, via this prop, on the dialog itself.
	 *
	 * Presence is the contract: passing a handler declares that the dialog owns
	 * navigation keys, so the shell reclaims DOM focus on them, and a press does
	 * not move DOM focus to a control of the dialog. Omit it for a
	 * variant whose content owns its own keyboard, and the shell leaves focus
	 * alone. The calendar of the other variants moves DOM focus itself, and the
	 * relative custom range has editable fields.
	 */
	onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
	/**
	 * Elements spared from the modal trap's outside marking. While open,
	 * `FloatingFocusManager` stamps `aria-hidden` on everything outside the
	 * floating element, including the reference. `input` mode passes its
	 * reference group here so the DateInput being edited stays visible to AT;
	 * the rest of the page remains hidden.
	 */
	getInsideElements?: () => Element[]
	/**
	 * Element to seed DOM focus on when the dialog opens. A calendar variant
	 * passes its entry day, the day that holds the Tab stop of the grid. The
	 * `input` popover passes the editable DateInput so focus lands there. The
	 * user can type, and the same keydown stream roves the grid through the
	 * input's `aria-activedescendant`. The input sits inside the reference
	 * (`getInsideElements`), so the modal focus manager treats it as related and
	 * does not self-close. When it is unset or its `current` is `null`, the
	 * focus goes to the dialog container.
	 */
	initialFocusRef?: RefObject<HTMLElement | null>
	/**
	 * Render the panel as a bottom sheet in place of the popover. The variant
	 * gives the result of {@link useDatePickerSheet}.
	 */
	sheet?: boolean
	/**
	 * Accessible name for the dialog.
	 *
	 * @defaultValue `'Select a date'`, in the language of the reader.
	 */
	label?: string
	/**
	 * The action row of the picker ({@link DatePickerFooter}). The popover shows
	 * it below the content. The sheet shows it at the start of its own footer
	 * row, and the Close button at the end.
	 */
	footer?: ReactNode
	children: ReactNode
}

/**
 * Portaled, animated modal dialog shell for the picker popover. It wires
 * `FloatingFocusManager`, and it seeds focus on `initialFocusRef` (not the
 * first tabbable, the "Previous month" button). An explicit `size` makes the
 * panel a density scope.
 *
 * @remarks
 * With `onKeyDown`, on a navigation key from a control in the dialog, the
 * dialog's `onKeyDown` gives DOM focus back to the seed of the open focus, the
 * input of the `input` popover. A grid move that re-anchors the month therefore
 * cannot drop focus to `<body>`. Portaled descendants (the month/year picker)
 * own their own keyboard.
 *
 * @internal
 */
export function DatePickerContent({
	state,
	size,
	onKeyDown,
	getInsideElements,
	initialFocusRef,
	sheet = false,
	label: labelProp,
	footer,
	children,
}: DatePickerContentProps) {
	const {
		dialogId,
		open,
		setFloating,
		floatingStyles,
		getFloatingProps,
		context,
		returnFocusRef,
		onExitComplete,
	} = state

	const intl = useIntl()

	const label = labelProp ?? intl.formatMessage(datePickerMessages.selectDate)

	const glass = useGlass()

	// The fallback of the open focus: the dialog container (tabIndex -1), not
	// floating-ui's default, the first tabbable, i.e. the "Previous month"
	// button.
	const dialogRef = useRef<HTMLDivElement | null>(null)

	const focusRef = initialFocusRef ?? dialogRef

	// `FloatingSurface` composes this through floating-ui, so the handlers of the
	// engine merge with it.
	const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// No handler: this content owns its own keyboard (see the `onKeyDown` prop
		// doc). Skip the routing guards and the focus reclaim, which would steal
		// from the field typed in.
		if (!onKeyDown) return

		// Keys from portaled descendants (the month/year picker
		// popover) bubble here through the React tree, not the
		// DOM. That surface owns its keyboard; acting here would
		// drive the calendar underneath it.
		if (event.target instanceof Node && !event.currentTarget.contains(event.target)) return

		// Activation keys on a DOM-focused control (the user Tabbed
		// to a header/footer button) belong to that control; only
		// the dialog itself routes them to the steered model.
		if (isActivationKey(event.key) && event.target !== event.currentTarget) return

		// Navigation keys belong to the steered model even when the
		// user has Tabbed onto a control inside. Give focus back to
		// the seed of the open focus first: the input of the `input`
		// popover. A grid move can re-anchor the month and
		// unmount the focused day button, which drops focus to <body>.
		if (RECLAIM_KEYS.has(event.key) && event.target !== event.currentTarget) {
			const seed = focusRef.current ?? event.currentTarget

			seed.focus()
		}

		onKeyDown(event)
	}

	// A steered model keeps DOM focus where it is: a press on a control of the
	// dialog does not move the focus to it. Without a steered model, a press
	// focuses the control, as in a standalone calendar. Then a month step from
	// the pointer does not leave the focus on a day button that unmounts.
	const handleMouseDown = onKeyDown
		? (event: MouseEvent<HTMLElement>) => event.preventDefault()
		: undefined

	if (sheet) {
		// The drawer is the dialog. It takes the open focus and the keys, as the
		// dialog of the popover does.
		return (
			<Drawer open={open} onOpenChange={(next) => context.onOpenChange(next)}>
				<DrawerPanel
					ref={dialogRef}
					size={size}
					tabIndex={-1}
					initialFocus={focusRef}
					returnFocusTo={returnFocusRef}
					className={cn(k.content.sheet.panel)}
					onKeyDown={handleDialogKeyDown}
					onMouseDown={handleMouseDown}
					footer={
						<>
							<div className={cn(k.content.sheet.actions)}>{footer}</div>
							<DrawerClose />
						</>
					}
				>
					<DrawerHeader>
						<DrawerTitle>{label}</DrawerTitle>
					</DrawerHeader>

					<DrawerBody>
						<div id={dialogId} data-slot="datepicker-sheet" className={cn(k.content.sheet.body)}>
							{children}
						</div>
					</DrawerBody>
				</DrawerPanel>
			</Drawer>
		)
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
			id={dialogId}
			role="dialog"
			aria-modal="true"
			aria-label={label}
			className={cn(k.portal)}
			tabIndex={-1}
			onKeyDown={handleDialogKeyDown}
		>
			<m.div
				{...k.content.motion}
				data-slot="datepicker-content"
				className={cn(k.content.base, glass && k.content.glass)}
				onMouseDown={handleMouseDown}
			>
				<Box
					bg={glass ? 'none' : 'popover'}
					outline={glass || undefined}
					radius="lg"
					className={cn(k.content.body)}
				>
					{children}
					{footer}
				</Box>
			</m.div>
		</FloatingSurface>
	)
}
