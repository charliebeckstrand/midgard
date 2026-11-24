'use client'

import { Fragment } from 'react'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { cn } from '../../core/cn'
import { keepFocusOnPress } from '../../primitives/control/control-keep-focus-on-press'
import { useIntl } from '../../primitives/intl/use-intl'
import { useWysiwyg } from './context'
import type { WysiwygAction } from './types'
import { WysiwygActionButton } from './wysiwyg-action-button'
import { WYSIWYG_ACTIONS, wysiwygActions, wysiwygMessages } from './wysiwyg-actions'
import { WysiwygLinkButton } from './wysiwyg-link-button'

/** Props for {@link WysiwygToolbar}. */
export type WysiwygToolbarProps = {
	/**
	 * The actions of the toolbar, in the order given. A separator goes where
	 * the list changes from text actions to block actions, or back. The default
	 * is each {@link WysiwygAction}, text actions first.
	 * @defaultValue WYSIWYG_ACTIONS
	 */
	actions?: readonly WysiwygAction[]
	/**
	 * Names the toolbar.
	 * @defaultValue `'Formatting'`, in the language of the reader.
	 */
	'aria-label'?: string
	/** Classes for the row of the toolbar. */
	className?: string
}

/**
 * The actions in groups: a run of text actions, or a run of block actions.
 *
 * @internal
 */
function actionGroups(actions: readonly WysiwygAction[]) {
	const groups: { block: boolean; actions: WysiwygAction[] }[] = []

	for (const action of actions) {
		const block = wysiwygActions[action].kind === 'block'

		const last = groups.at(-1)

		if (last?.block === block) last.actions.push(action)
		else groups.push({ block, actions: [action] })
	}

	return groups
}

/**
 * The formatting toolbar of a {@link Wysiwyg}. Give it as a child of the
 * Wysiwyg, and it renders in the row above the field, or above the frame with
 * `separated` on the Wysiwyg. `actions` sets which buttons it shows.
 *
 * Each text and block action is a toggle button with `aria-pressed`, which
 * shows whether the action is on at the selection. Link opens a popover with
 * a text field and a URL field. The text field holds the selected text, and
 * Apply links it, or puts the text and the link in at the caret. Each button
 * has a tooltip with its name, and its shortcut is in `aria-keyshortcuts`.
 *
 * @remarks The toolbar has `role="toolbar"`, one Tab stop, and arrow keys
 * between its buttons, and `aria-controls` points at the field. A press on a
 * button does not move the focus, so the selection stays in the field and the
 * virtual keyboard stays open. Until the editor loads, the buttons are
 * `aria-disabled` and keep their places in the arrow order. While the field
 * is disabled or read-only, the toolbar is `inert`: it has no Tab stop, it
 * takes no press, and it opens no tooltip.
 */
export function WysiwygToolbar({
	actions = WYSIWYG_ACTIONS,
	'aria-label': ariaLabel,
	className,
}: WysiwygToolbarProps) {
	const { fieldId, locked, toolbarClassName } = useWysiwyg()

	const intl = useIntl()

	return (
		<Toolbar
			aria-label={ariaLabel ?? intl.formatMessage(wysiwygMessages.toolbar)}
			aria-controls={fieldId}
			inert={locked}
			// The buttons take the affix step, one below the field, as the buttons
			// of the actions row do.
			data-density="slot"
			className={cn(toolbarClassName, className)}
			onMouseDown={keepFocusOnPress}
		>
			{actionGroups(actions).map((group, index) => (
				<Fragment key={group.actions.join(' ')}>
					{index > 0 && <ToolbarSeparator />}
					<ToolbarGroup
						aria-label={intl.formatMessage(
							group.block ? wysiwygMessages.blocks : wysiwygMessages.text,
						)}
					>
						{group.actions.map((action) =>
							action === 'link' ? (
								<WysiwygLinkButton key={action} />
							) : (
								<WysiwygActionButton key={action} action={action} />
							),
						)}
					</ToolbarGroup>
				</Fragment>
			))}
		</Toolbar>
	)
}
