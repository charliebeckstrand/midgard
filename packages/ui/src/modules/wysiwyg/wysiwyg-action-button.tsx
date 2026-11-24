'use client'

import { type ComponentProps, useSyncExternalStore } from 'react'
import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { useHydrated } from '../../hooks/use-hydrated'
import { useIntl } from '../../primitives/intl/use-intl'
import { isApplePlatform } from '../../utilities/apple-platform'
import { useWysiwyg } from './context'
import type { WysiwygAction } from './types'
import { shortcutAria, wysiwygActions } from './wysiwyg-actions'

/** The server render has no editor, so no action is on. @internal */
const serverInactive = () => false

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
 * opens a popover, so it is no toggle, and its trigger handles the press. It
 * is on while the selection is in a link.
 *
 * @remarks The pressed state comes from a store of the editor, so a keystroke
 * renders only the buttons whose state changed. The shortcut in
 * `aria-keyshortcuts` names Command on Apple platforms and Control elsewhere.
 * The server render names Command.
 * @internal
 */
export function WysiwygActionButton({ action, onClick, ...props }: WysiwygActionButtonProps) {
	const { ready, locked, subscribe, isActive, run } = useWysiwyg()

	const intl = useIntl()

	// The server does not know the platform of the reader, so the server render
	// and the hydration render name the keys of an Apple platform.
	const apple = useHydrated() ? isApplePlatform() : true

	const active = useSyncExternalStore(subscribe, () => isActive(action), serverInactive)

	const { message, shortcut, icon: Glyph } = wysiwygActions[action]

	const label = intl.formatMessage(message)

	return (
		<ButtonIconTooltip
			data-slot="wysiwyg-action"
			{...props}
			data-action={action}
			variant="bare"
			aria-pressed={action === 'link' ? undefined : active}
			aria-keyshortcuts={shortcutAria(shortcut, apple)}
			label={label}
			icon={<Glyph />}
			active={active}
			disabled={!ready || locked}
			onClick={action === 'link' ? onClick : () => run(action)}
		/>
	)
}
