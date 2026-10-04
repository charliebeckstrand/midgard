'use client'

import { type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { k } from '../../recipes/kata/menu'
import { Drawer, DrawerBody, DrawerDescription, DrawerHeader, DrawerTitle } from '../drawer'
import { useMenuActions, useMenuState } from './context'
import { MENUITEM_SELECTOR } from './use-menu-state'

/** Props for {@link MenuSheet}. */
type MenuSheetProps = {
	/** The heading of the sheet. Omit it to use the name of the trigger. */
	title?: ReactNode
	/** A line of text below the heading. */
	description?: ReactNode
	/** Opt the sheet into the glass surface, as the `glass` of {@link MenuContent} does for the popover. */
	glass?: boolean
	className?: string
	children: ReactNode
}

/**
 * The accessible name of a trigger: its `aria-label`, else its text.
 *
 * @internal
 */
function triggerName(trigger: HTMLElement | null): string | undefined {
	const name = trigger?.getAttribute('aria-label') ?? trigger?.textContent

	return name?.trim() || undefined
}

/**
 * The panel of a dropdown menu on a phone: a bottom sheet in place of the
 * popover. It holds the same rows, at the full width of the screen, and grows
 * to them up to the stop of the drawer, where its body scrolls. The Close button
 * in its footer, a press on the backdrop, `Escape`, or a selected row closes
 * it. It has no handle, because the rows set its height.
 *
 * @remarks
 * The sheet is a modal dialog, so focus goes into it and the rows rove by real
 * focus, as in a context menu. The panel takes the focus on open, not the first
 * row, so a tap does not show a focused row. Focus goes back to the trigger on
 * close.
 *
 * The heading names the sheet and the menu in it. It is the `title` of
 * {@link MenuContent}, or the name of the trigger, which is read when the sheet
 * opens. The `description` of {@link MenuContent} shows below the heading and
 * describes the sheet.
 *
 * @internal
 */
export function MenuSheet({ title, description, glass, className, children }: MenuSheetProps) {
	const { open, menuId, size } = useMenuState()
	const { setOpen, triggerRef } = useMenuActions()

	const panelRef = useRef<HTMLDivElement>(null)

	const titleId = useId()

	const [triggerTitle, setTriggerTitle] = useState<string>()

	// Read on open, not in render: the trigger is a DOM node, and its name can
	// change while the menu is closed.
	useLayoutEffect(() => {
		if (open) setTriggerTitle(triggerName(triggerRef.current))
	}, [open, triggerRef])

	const heading = title ?? triggerTitle

	const handleKeyDown = useA11yRoving(panelRef, {
		itemSelector: MENUITEM_SELECTOR,
		focusOnEmpty: true,
		typeahead: true,
	})

	return (
		<Drawer
			open={open}
			onOpenChange={setOpen}
			size={size}
			glass={glass}
			initialFocus={panelRef}
			aria-label={heading === undefined || typeof heading === 'string' ? heading : undefined}
		>
			{heading === undefined ? null : (
				<DrawerHeader>
					<DrawerTitle id={titleId}>{heading}</DrawerTitle>

					{description === undefined ? null : <DrawerDescription>{description}</DrawerDescription>}
				</DrawerHeader>
			)}

			<DrawerBody className={k.sheetBody}>
				<div
					ref={panelRef}
					id={menuId}
					role="menu"
					aria-labelledby={heading === undefined ? undefined : titleId}
					tabIndex={-1}
					data-slot="menu-sheet"
					className={cn(k.sheet, className)}
					onKeyDown={handleKeyDown}
				>
					{children}
				</div>
			</DrawerBody>
		</Drawer>
	)
}
