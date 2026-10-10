'use client'

import { type ReactNode, useId, useLayoutEffect, useState } from 'react'
import { cn } from '../../core'
import { FloatingSurface } from '../../primitives/floating-surface'
import { PopoverPanel } from '../../primitives/popover'
import { useResolvedSurface } from '../../providers/glass/context'
import { k } from '../../recipes/kata/menu'
import { useMenuActions, useMenuState } from './context'
import { MenuSheet } from './menu-sheet'
import { MenuViewport } from './menu-viewport'
import { MENUITEM_SELECTOR } from './use-menu-state'

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
	 * Opt the surface into the translucent glass chrome, as the panel family
	 * does. An ambient `<GlassProvider>` already turns it on; this is the
	 * per-surface opt-in for a tree that has none. Set `false` to keep the flat
	 * surface inside a `<GlassProvider>`.
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
 * `title` and a `description` show above the rows in each form.
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
	const { close, static: isStatic, setFloating, triggerRef } = useMenuActions()
	const glass = useResolvedSurface(glassProp) === 'glass'

	const [triggerId, setTriggerId] = useState<string>()

	const titleId = useId()

	const descriptionId = useId()

	// The trigger of a dropdown names the menu. Its id can come from a cloned
	// child, so read it from the DOM node on open, not in render.
	useLayoutEffect(() => {
		if (open && isDropdown) setTriggerId(triggerRef.current?.id || undefined)
	}, [open, isDropdown, triggerRef])

	// A name from the consumer replaces the name from the title, and the title
	// replaces the name from the trigger.
	const named = ariaLabel !== undefined || ariaLabelledby !== undefined

	if (isSheet) {
		return (
			<MenuSheet title={title} description={description} glass={glass} className={className}>
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
		<div data-slot="menu-header" className={k.header.base}>
			<div id={titleId} className={cn(k.header.title)}>
				{title}
			</div>

			{described ? (
				<div id={descriptionId} className={cn(k.header.description)}>
					{description}
				</div>
			) : null}
		</div>
	) : null

	const viewport = <MenuViewport fitted={!isStatic}>{children}</MenuViewport>

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
				className={cn(k.content, className)}
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
			className={k.surface}
		>
			<PopoverPanel
				density={size}
				id={menuId}
				role="menu"
				// The title or the trigger names a dropdown, unless the consumer gives
				// a name. A context menu has no trigger, so its name comes from the
				// content.
				aria-label={ariaLabel}
				aria-labelledby={labelledby}
				aria-describedby={described ? descriptionId : undefined}
				itemSelector={MENUITEM_SELECTOR}
				// A dropdown keeps focus on its trigger while open; opening never
				// pulls focus into the panel. Seating focus on the portaled,
				// animating panel is the path that drops to `<body>` on open in a
				// real browser — leaving it on the trigger sidesteps that, and Tab
				// off the trigger closes the menu (see MenuTrigger). A right-click
				// context menu has no persistent trigger to hold focus, so it still
				// pulls focus into the panel for keyboard navigation.
				autoFocus={!isDropdown}
				// Tab is held inside the panel wherever focus lives in it (a
				// right-click context menu): the menu is left by dismissing it, and
				// Tab walking off into the page behind an open overlay strands the
				// user outside a surface still on screen. A dropdown is exempt — its
				// focus stays on the trigger, where Tab out is the documented close.
				trapTab={!isDropdown}
				typeahead
				glass={glass}
				className={cn(k.floating, k.content, className)}
				onKeyDown={(event) => {
					if (event.key === 'Escape') close()
				}}
			>
				{header}

				{viewport}
			</PopoverPanel>
		</FloatingSurface>
	)
}
