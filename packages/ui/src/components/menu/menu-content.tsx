'use client'

import { type ReactNode, useId, useLayoutEffect, useState } from 'react'
import { cn } from '../../core/cn'
import { queryItems } from '../../hooks/a11y/use-a11y-roving'
import { FloatingSurface } from '../../primitives/floating-surface'
import { useResolvedSurface } from '../../primitives/glass/context'
import { PopoverPanel } from '../../primitives/popover'
import { k } from '../../recipes/kata/menu'
import { useMenuActions, useMenuState } from './context'
import { MenuSheet } from './menu-sheet'
import { MenuViewport } from './menu-viewport'
import { MENUITEM_SELECTOR } from './use-menu-root'

/** The slots of a menu panel. */
const panel = k()

/** Props for {@link MenuContent}: an optional accessible name for the menu. */
export type MenuContentProps = {
	className?: string
	/**
	 * Accessible name for the menu. A `static` menu or a context menu has no
	 * trigger to name it, so it needs this name or `aria-labelledby`. Omit it on
	 * a dropdown, and the trigger names the menu.
	 */
	'aria-label'?: string
	/**
	 * Id of a visible element that names the menu. Omit it on a dropdown, and
	 * the trigger names the menu.
	 */
	'aria-labelledby'?: string
	/**
	 * Opts the popover panel into the translucent glass chrome. An ambient
	 * `<GlassProvider>` already turns it on; this is the per-surface opt-in for
	 * a tree that has none. Set `false` to keep the flat surface inside a
	 * `<GlassProvider>`. The bottom sheet on a phone does not read it: it
	 * follows the Surfaces setting of the reader, as each Drawer does.
	 *
	 * @defaultValue `false`, or the flag of the enclosing `<GlassProvider>`.
	 */
	glass?: boolean
	/**
	 * The heading of the menu. The panel shows it above the rows, and the bottom
	 * sheet on a phone shows it as its title. It names the menu, unless
	 * `aria-label` or `aria-labelledby` gives the name. Omit it, and the panel
	 * shows no heading, and the sheet uses the name of the trigger.
	 */
	title?: ReactNode
	/**
	 * A line of text below the heading, such as the email of the signed-in user.
	 * It describes the menu. The panel shows it only with a `title`.
	 */
	description?: ReactNode
	children: ReactNode
}

/**
 * The menu panel: a `role="menu"` surface with roving focus and typeahead over
 * its items. A `static` menu renders inline as part of the page, with no
 * autofocus, and it is one Tab stop: Tab goes to one row, and the arrow keys
 * move between the rows. Otherwise it mounts as a floating overlay that closes
 * on `Escape`. The `title`, else the trigger of a dropdown, names the menu.
 * Takes the `size` of the enclosing {@link Menu} as its density scope.
 * On a phone, a dropdown opens as a bottom sheet instead, with the same rows
 * and a Close button below them (see the `sheet` prop of {@link Menu}). A
 * `title` and a `description` show above the rows in each form. A floating
 * panel or a sheet stamps `data-open` while the menu is open.
 *
 * @remarks Items scroll inside a height-capped viewport whose clipped edges
 * fade out while more content lies past them. An overflowing menu therefore
 * reads as scrollable, without a persistent scrollbar. A floating panel is
 * capped at the space on its side of the trigger, so a long menu stays on
 * screen at each viewport size.
 */
export function MenuContent({
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	glass: glassProp,
	title,
	description,
	children,
}: MenuContentProps) {
	const { open, menuId, isDropdown, isSheet, floatingStyles, getFloatingProps, size } =
		useMenuState()
	const {
		close,
		dismissToTab,
		openedByKey,
		static: isStatic,
		setFloating,
		triggerRef,
	} = useMenuActions()
	const glass = useResolvedSurface(glassProp) === 'glass'

	const [triggerId, setTriggerId] = useState<string>()

	const titleId = useId()

	const descriptionId = useId()

	// The trigger of a dropdown names the menu. Its id can come from a cloned
	// child, so read it from the DOM node on open, not in render.
	useLayoutEffect(() => {
		if (open && isDropdown) setTriggerId(triggerRef.current?.id || undefined)
	}, [open, isDropdown, triggerRef])

	const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null)

	// A key opens a floating menu with the focus on its first row, as the menu
	// button pattern of the APG tells. A dropdown reads the event that opened it.
	// A context menu has a `triggerRef` only after a keyboard open (`openAt`).
	// A press of the pointer puts the focus on the panel. On a mount the panel
	// focuses itself (`PopoverPanel`) before this effect runs. A reopen inside
	// the exit animation reuses the mounted panel, and that autofocus does not
	// run again, so this effect also focuses the panel when the focus is not in
	// it. If not, the focus stays on the trigger, and the keys of the open menu
	// reach nothing.
	useLayoutEffect(() => {
		if (!open || isSheet || isStatic || !panelNode) return

		const keyOpen = isDropdown ? openedByKey() : triggerRef.current !== null

		if (keyOpen) {
			queryItems(panelNode, MENUITEM_SELECTOR)[0]?.focus({ preventScroll: true })
		} else if (!panelNode.contains(document.activeElement)) {
			panelNode.focus({ preventScroll: true })
		}
	}, [open, isSheet, isStatic, isDropdown, panelNode, openedByKey, triggerRef])

	// A name from the consumer replaces the name from the title, and the title
	// replaces the name from the trigger.
	const named = ariaLabel !== undefined || ariaLabelledby !== undefined

	if (isSheet) {
		return (
			<MenuSheet
				title={title}
				description={description}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				className={className}
			>
				{children}
			</MenuSheet>
		)
	}

	const titled = title !== undefined

	const described = titled && description !== undefined

	let labelledby = ariaLabelledby

	if (!named && titled) labelledby = titleId
	else if (!named && isDropdown) labelledby = triggerId

	const header = titled ? (
		<div data-slot="menu-header" className={panel.header.base}>
			<div id={titleId} className={panel.header.title}>
				{title}
			</div>

			{described ? (
				<div id={descriptionId} className={panel.header.description}>
					{description}
				</div>
			) : null}
		</div>
	) : null

	const viewport = <MenuViewport>{children}</MenuViewport>

	if (isStatic) {
		return (
			<PopoverPanel
				density={size}
				role="menu"
				aria-label={ariaLabel}
				aria-labelledby={labelledby}
				aria-describedby={described ? descriptionId : undefined}
				itemSelector={MENUITEM_SELECTOR}
				typeahead
				glass={glass}
				// A static menu is part of the page, not a transient overlay;
				// `autoFocus={false}` keeps it from grabbing focus on mount.
				autoFocus={false}
				// The page reaches the menu with Tab, so one row holds the Tab stop.
				manageTabIndex
				className={cn(panel.base, className)}
			>
				{header}

				{viewport}
			</PopoverPanel>
		)
	}

	return (
		<FloatingSurface
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			className={panel.surface}
		>
			<PopoverPanel
				density={size}
				open={open}
				id={menuId}
				role="menu"
				// The title or the trigger names a dropdown, unless the consumer gives
				// a name. A context menu has no trigger, so its name comes from the
				// content.
				aria-label={ariaLabel}
				aria-labelledby={labelledby}
				aria-describedby={described ? descriptionId : undefined}
				itemSelector={MENUITEM_SELECTOR}
				ref={setPanelNode}
				// Focus goes into the panel on open. The menu keeps it until a row
				// runs, Escape closes the menu, or Tab leaves it.
				autoFocus
				// A context menu holds Tab inside the panel: it has no trigger for Tab
				// to go on from. In a dropdown, Tab closes the menu and goes on from
				// the trigger (below).
				trapTab={!isDropdown}
				typeahead
				glass={glass}
				className={cn(panel.floating, panel.base, className)}
				onKeyDown={(event) => {
					// The focus goes to the trigger before the browser runs the Tab, so
					// the Tab goes on from the trigger to the tabbable after or before
					// it. The `'focus-out'` close leaves the focus there.
					if (event.key === 'Tab' && isDropdown) {
						triggerRef.current?.focus({ preventScroll: true })

						dismissToTab(event.nativeEvent)

						return
					}

					if (event.key !== 'Escape') return

					// React commits the close before the document listener runs, so
					// the layer below is on top by then. `preventDefault` tells it
					// that this press is consumed.
					event.preventDefault()

					close()
				}}
			>
				{header}

				{viewport}
			</PopoverPanel>
		</FloatingSurface>
	)
}
