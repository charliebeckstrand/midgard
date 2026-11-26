'use client'

import { ChevronLeft } from 'lucide-react'
import { type KeyboardEvent, type Ref, useSyncExternalStore } from 'react'
import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { Toolbar, ToolbarGroup } from '../../components/toolbar'
import { dataAttr } from '../../core/data-attr'
import { useHydrated } from '../../hooks/use-hydrated'
import { keepFocusOnPress } from '../../primitives/control/control-keep-focus-on-press'
import { Glyph } from '../../primitives/glyph'
import { useIntl } from '../../primitives/intl/use-intl'
import { isApplePlatform } from '../../utilities/apple-platform'
import { useWysiwyg } from './context'
import type { WysiwygHeadingLevel } from './types'
import { shortcutAria, wysiwygHeadingLevels, wysiwygMessages } from './wysiwyg-actions'

/** The server render has no editor, so no level is on. @internal */
const serverLevel = () => null

/** The server render has no editor, so each level is open. @internal */
const serverOpen = () => true

/** Props for {@link WysiwygHeadingRail}. @internal */
type WysiwygHeadingRailProps = {
	/** Whether the rail shows in place of the toolbar row. */
	open: boolean
	/** Closes the rail, and shows the toolbar row again. */
	onClose: () => void
	ref?: Ref<HTMLDivElement>
}

/**
 * The row of heading levels that a press on the Heading button of a
 * {@link WysiwygToolbar} shows in place of the toolbar row: a Back button and
 * a button for each of the levels Text, H1, H2, and H3, with the glyph of the
 * level. The level of the text blocks of the selection is pressed. None is
 * pressed while the blocks have different levels, or a level below 3.
 *
 * A press on a level sets it and closes the rail, and so do Enter and Space.
 * The arrow keys move between the buttons. Back and Escape close the rail
 * with no change.
 *
 * @remarks A level that the blocks cannot take, such as a heading in the first
 * block of a list item, is disabled. The rail is a toolbar named "Heading",
 * and the levels are a group named "Heading level", in the language of the
 * reader. Each level has `aria-pressed`, a tooltip with its name, and its
 * shortcut in `aria-keyshortcuts`. A press does not move the focus, so the
 * selection stays in the field and the virtual keyboard stays open.
 * @internal
 */
export function WysiwygHeadingRail({ open, onClose, ref }: WysiwygHeadingRailProps) {
	const { fieldId, locked, subscribe, headingLevel, setHeading } = useWysiwyg()

	const intl = useIntl()

	const level = useSyncExternalStore(subscribe, headingLevel, serverLevel)

	function pick(next: WysiwygHeadingLevel) {
		setHeading(next)

		onClose()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== 'Escape') return

		event.preventDefault()

		event.stopPropagation()

		onClose()
	}

	return (
		<Toolbar
			ref={ref}
			data-hidden={dataAttr(!open)}
			aria-label={intl.formatMessage(wysiwygMessages.heading)}
			aria-controls={fieldId}
			inert={locked || !open}
			onMouseDown={keepFocusOnPress}
			onKeyDown={handleKeyDown}
		>
			<ButtonIconTooltip
				data-slot="wysiwyg-heading-back"
				variant="bare"
				label={intl.formatMessage(wysiwygMessages.back)}
				icon={<Glyph icon={ChevronLeft} className="rtl:-scale-x-100" />}
				disabled={false}
				onClick={onClose}
			/>
			<ToolbarGroup aria-label={intl.formatMessage(wysiwygMessages.headingLevel)}>
				{wysiwygHeadingLevels.map((entry) => (
					<WysiwygHeadingLevelButton
						key={entry.level}
						entry={entry}
						pressed={level === entry.level}
						onPick={pick}
					/>
				))}
			</ToolbarGroup>
		</Toolbar>
	)
}

/**
 * One level of a {@link WysiwygHeadingRail}: the glyph, the name, and the
 * shortcut of the level. It is disabled while the selection cannot take the
 * level.
 *
 * @internal
 */
function WysiwygHeadingLevelButton({
	entry,
	pressed,
	onPick,
}: {
	entry: (typeof wysiwygHeadingLevels)[number]
	pressed: boolean
	onPick: (level: WysiwygHeadingLevel) => void
}) {
	const { subscribe, canSetHeading } = useWysiwyg()

	const intl = useIntl()

	// The server does not know the platform of the reader, so the server render
	// and the hydration render name the keys of an Apple platform.
	const apple = useHydrated() ? isApplePlatform() : true

	const enabled = useSyncExternalStore(subscribe, () => canSetHeading(entry.level), serverOpen)

	return (
		<ButtonIconTooltip
			data-slot="wysiwyg-heading-level"
			variant="bare"
			aria-pressed={pressed}
			aria-keyshortcuts={shortcutAria(entry.shortcut, apple)}
			label={intl.formatMessage(entry.message)}
			icon={<Glyph icon={entry.icon} />}
			active={pressed}
			disabled={!enabled}
			onClick={() => onPick(entry.level)}
		/>
	)
}
