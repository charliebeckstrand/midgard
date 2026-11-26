'use client'

import { type ComponentProps, useSyncExternalStore } from 'react'
import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { useHydrated } from '../../hooks/use-hydrated'
import { Glyph } from '../../primitives/glyph'
import { useIntl } from '../../primitives/intl/use-intl'
import { isApplePlatform } from '../../utilities/apple-platform'
import { useWysiwyg } from './context'
import type { WysiwygAction } from './types'
import { shortcutAria, wysiwygActions, wysiwygHeadingLevels } from './wysiwyg-actions'

/** The server render has no editor, so no action is on. @internal */
const serverInactive = () => false

/** The server render has no editor, so Heading shows the glyph of text. @internal */
const serverLevel = () => null

/** Props for {@link WysiwygActionButton}. @internal */
type WysiwygActionButtonProps = { action: WysiwygAction } & Omit<
	ComponentProps<typeof ButtonIconTooltip>,
	'label' | 'tooltip' | 'icon' | 'active' | 'disabled'
>

/**
 * A button of a {@link WysiwygToolbar}: the glyph, the name, and the shortcut
 * of its action, from the action table. The tooltip shows the name only. The
 * button is on while the action is on at the selection.
 *
 * A toggle action has `aria-pressed`, and a press runs it. The link button
 * opens a dialog, and the heading button opens the rail of the levels, so
 * neither is a toggle, and the `onClick` of the caller handles the press. Link
 * is on while the selection is in a link, and Heading is on while each text
 * block of the selection is a heading. Heading has no shortcut of its own,
 * and it shows the glyph of the level of the selection: Text, H1, H2, or H3.
 * It shows the glyph of Text while the blocks have different levels or a
 * level below 3. Before the editor loads, the markup of the field gives the
 * level. The server render shows the glyph of Text.
 *
 * The button looks and works the same before the editor loads. A press then
 * starts the load, and the action runs when the editor comes.
 *
 * @remarks The pressed state comes from a store of the editor, so a keystroke
 * renders only the buttons whose state changed. The shortcut in
 * `aria-keyshortcuts` names Command on Apple platforms and Control elsewhere.
 * The server render names Command.
 * @internal
 */
export function WysiwygActionButton({ action, onClick, ...props }: WysiwygActionButtonProps) {
	const { locked, subscribe, isActive, run, headingLevel } = useWysiwyg()

	const intl = useIntl()

	// The server does not know the platform of the reader, so the server render
	// and the hydration render name the keys of an Apple platform.
	const apple = useHydrated() ? isApplePlatform() : true

	const active = useSyncExternalStore(subscribe, () => isActive(action), serverInactive)

	// Only Heading reads the level, so a change of level renders no other button.
	const level = useSyncExternalStore(
		subscribe,
		() => (action === 'heading' ? headingLevel() : null),
		serverLevel,
	)

	const { message, shortcut } = wysiwygActions[action]

	const icon =
		(level !== null && wysiwygHeadingLevels.find((entry) => entry.level === level)?.icon) ||
		wysiwygActions[action].icon

	const label = intl.formatMessage(message)

	// Link opens a dialog, and Heading opens the rail of the levels, so neither
	// is a toggle, and the `onClick` of the caller handles the press.
	const toggle = action !== 'link' && action !== 'heading'

	return (
		<ButtonIconTooltip
			data-slot="wysiwyg-action"
			{...props}
			data-action={action}
			variant="bare"
			aria-pressed={toggle ? active : undefined}
			aria-keyshortcuts={shortcut && shortcutAria(shortcut, apple)}
			label={label}
			icon={<Glyph icon={icon} />}
			active={active}
			disabled={locked}
			onClick={toggle ? () => run(action) : onClick}
		/>
	)
}
