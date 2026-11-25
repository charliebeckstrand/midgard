'use client'

import { type ComponentProps, Fragment, memo, useLayoutEffect, useRef, useState } from 'react'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import { keepFocusOnPress } from '../../primitives/control/control-keep-focus-on-press'
import { useIntl } from '../../primitives/intl/use-intl'
import { useWysiwyg } from './context'
import type { WysiwygAction } from './types'
import { WysiwygActionButton } from './wysiwyg-action-button'
import {
	WYSIWYG_ACTIONS,
	type WysiwygActionGroup,
	wysiwygActions,
	wysiwygGroupMessages,
	wysiwygMessages,
} from './wysiwyg-actions'
import { WysiwygHeadingRail } from './wysiwyg-heading-rail'
import { WysiwygLinkButton } from './wysiwyg-link-button'

/**
 * Props for {@link WysiwygToolbar}. The native props go to the row of the
 * toolbar, which holds the toolbar and the heading rail.
 */
export type WysiwygToolbarProps = Omit<ComponentProps<'div'>, 'aria-label'> & {
	/**
	 * The actions of the toolbar, in the order given. A separator goes where
	 * the list changes from one group to the next: heading (`heading`), text
	 * (`bold`, `italic`, `strike`), lists (`bulletList`, `orderedList`),
	 * references (`link`, `quote`), and code (`code`, `codeBlock`). The
	 * default is each {@link WysiwygAction}, in that order.
	 * @defaultValue WYSIWYG_ACTIONS
	 */
	actions?: readonly WysiwygAction[]
	/**
	 * Names the toolbar, and not the row that holds it.
	 * @defaultValue `'Formatting'`, in the language of the reader.
	 */
	'aria-label'?: string
}

/**
 * The actions in groups: each run of actions of one {@link WysiwygActionGroup}.
 *
 * @internal
 */
function actionGroups(actions: readonly WysiwygAction[]) {
	const groups: { group: WysiwygActionGroup; actions: WysiwygAction[] }[] = []

	for (const action of actions) {
		const { group } = wysiwygActions[action]

		const last = groups.at(-1)

		if (last?.group === group) last.actions.push(action)
		else groups.push({ group, actions: [action] })
	}

	return groups
}

/**
 * The formatting toolbar of a {@link Wysiwyg}. Give it as a child of the
 * Wysiwyg, and it renders in the row above the field, or above the frame with
 * `separated` on the Wysiwyg. `actions` sets which buttons it shows.
 *
 * Each text and block action is a toggle button with `aria-pressed`, which
 * shows whether the action is on at the selection. Link opens a dialog with
 * a text field and a URL field. The text field holds the selected text, and
 * Apply links it, or puts the text and the link in at the caret. Each button
 * has a tooltip with its name, and its shortcut is in `aria-keyshortcuts`.
 *
 * Heading shows the heading rail in place of the toolbar row: a Back button
 * and the levels Text, H1, H2, and H3. A press on a level sets the level of
 * the text blocks of the selection and shows the toolbar row again. Heading
 * is on while each text block of the selection is a heading. The keys
 * `$mod+Alt+1` to `$mod+Alt+3` make a heading of that level, and
 * `$mod+Alt+0` makes text, with or without the button. The rail and the row
 * are in one grid cell, so the swap does not change the size of the toolbar.
 * With the focus in the row, the focus goes to the selected level when the
 * rail opens, and back to Heading when it closes.
 *
 * @remarks The toolbar has `role="toolbar"`, one Tab stop, and arrow keys
 * between its buttons, and `aria-controls` points at the field. Each run of
 * one group is a `group` with the name of the group, such as "Lists", in the
 * language of the reader. A press on a button does not move the focus, so the
 * selection stays in the field and the virtual keyboard stays open. The
 * buttons are ready from the first paint. A press before the editor loads
 * starts the load, and the action runs when the editor comes: a toggle action
 * runs on the selection, and the link dialog opens. While the field is disabled or read-only, the toolbar is
 * `inert`: it has no Tab stop, it takes no press, and it opens no tooltip.
 * The toolbar is memoized: it renders again when its props change, or when
 * the state of the field that it shows changes. An edit in a controlled field
 * thus does not render each button again.
 */
export const WysiwygToolbar = memo(function WysiwygToolbar({
	actions = WYSIWYG_ACTIONS,
	'aria-label': ariaLabel,
	className,
	...props
}: WysiwygToolbarProps) {
	const { fieldId, locked, toolbarClassName } = useWysiwyg()

	const intl = useIntl()

	const hasHeading = actions.includes('heading')

	const [railOpen, setRailOpen] = useState(false)

	// A toolbar with no Heading has no rail, also when `actions` drops Heading
	// while the rail is open.
	const rail = railOpen && hasHeading

	const rowRef = useRef<HTMLDivElement>(null)

	const railRef = useRef<HTMLDivElement>(null)

	const headingRef = useRef<HTMLButtonElement>(null)

	// Whether the focus goes with the swap: the selected level when the rail
	// opens, and Heading when it closes. The row that hides is inert, so a focus
	// in it would go to the page. A swap with the focus in the field, as after a
	// press, moves no focus.
	const focusAfterSwap = useRef(false)

	useLayoutEffect(() => {
		if (!focusAfterSwap.current) return

		focusAfterSwap.current = false

		if (!rail) {
			headingRef.current?.focus()

			return
		}

		const levels = railRef.current

		const level =
			levels?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
			levels?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)')

		level?.focus()
	}, [rail])

	function swap(open: boolean) {
		const from = open ? rowRef.current : railRef.current

		focusAfterSwap.current = from?.contains(from.ownerDocument.activeElement) ?? false

		setRailOpen(open)
	}

	return (
		<div
			{...props}
			data-slot="wysiwyg-toolbar"
			// The row and the rail take the affix step, one below the field, as the
			// buttons of the actions row do. The margin of a bare toolbar takes the
			// step too.
			data-density="slot"
			className={cn(toolbarClassName, className)}
		>
			<Toolbar
				ref={rowRef}
				data-hidden={dataAttr(rail)}
				aria-label={ariaLabel ?? intl.formatMessage(wysiwygMessages.toolbar)}
				aria-controls={fieldId}
				inert={locked || rail}
				onMouseDown={keepFocusOnPress}
			>
				{actionGroups(actions).map((group, index) => (
					<Fragment key={group.actions.join(' ')}>
						{index > 0 && <ToolbarSeparator />}
						<ToolbarGroup aria-label={intl.formatMessage(wysiwygGroupMessages[group.group])}>
							{group.actions.map((action) => {
								if (action === 'link') return <WysiwygLinkButton key={action} />

								if (action === 'heading') {
									return (
										<WysiwygActionButton
											key={action}
											ref={headingRef}
											action={action}
											onClick={() => swap(true)}
										/>
									)
								}

								return <WysiwygActionButton key={action} action={action} />
							})}
						</ToolbarGroup>
					</Fragment>
				))}
			</Toolbar>
			{hasHeading && <WysiwygHeadingRail ref={railRef} open={rail} onClose={() => swap(false)} />}
		</div>
	)
})
