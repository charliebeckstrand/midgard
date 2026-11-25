'use client'

import { type KeyboardEvent, type Ref, useRef, useSyncExternalStore } from 'react'
import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Toolbar } from '../../components/toolbar'
import { dataAttr } from '../../core/data-attr'
import { useHydrated } from '../../hooks/use-hydrated'
import { keepFocusOnPress } from '../../primitives/control/control-keep-focus-on-press'
import { ChevronLeft } from '../../primitives/icons/glyphs/glyph-chevron-left'
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
 * a `Segment` of the levels Text, H1, H2, and H3. The selected level is the
 * level of the text blocks of the selection. None is selected while the blocks
 * have different levels, or a level below 3.
 *
 * A press on a level sets it and closes the rail. An arrow key picks a level
 * and keeps the rail open, as in a radio group, and Enter or Escape closes it.
 * Back closes the rail with no change.
 *
 * @remarks A level that the blocks cannot take, such as a heading in the first
 * block of a list item, is disabled. The rail is a toolbar named "Heading",
 * and the levels are a radio group named "Heading level", in the language of
 * the reader. Each level names its shortcut in
 * `aria-keyshortcuts`. A press does not move the focus, so the selection stays
 * in the field and the virtual keyboard stays open.
 * @internal
 */
export function WysiwygHeadingRail({ open, onClose, ref }: WysiwygHeadingRailProps) {
	const { fieldId, locked, subscribe, headingLevel, setHeading } = useWysiwyg()

	const intl = useIntl()

	const level = useSyncExternalStore(subscribe, headingLevel, serverLevel)

	// Whether the last input in the rail was a press, and not a key. A pick by a
	// press closes the rail; a pick by an arrow key keeps it open. The segment
	// picks on the keydown of the arrow, before the rail gets the bubble, so the
	// rail reads each key in the capture phase.
	const pressed = useRef(false)

	function handleValueChange(value: string | null) {
		if (value === null) return

		setHeading(Number(value) as WysiwygHeadingLevel)

		if (pressed.current) onClose()
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		const onLevel = event.target instanceof Element && event.target.getAttribute('role') === 'radio'

		if (event.key === 'Escape' || (event.key === 'Enter' && onLevel)) {
			event.preventDefault()

			event.stopPropagation()

			onClose()
		}
	}

	return (
		<Toolbar
			ref={ref}
			data-hidden={dataAttr(!open)}
			aria-label={intl.formatMessage(wysiwygMessages.heading)}
			aria-controls={fieldId}
			inert={locked || !open}
			onMouseDown={keepFocusOnPress}
			onPointerDownCapture={() => {
				pressed.current = true
			}}
			onKeyDownCapture={() => {
				pressed.current = false
			}}
			onKeyDown={handleKeyDown}
		>
			<ButtonIconTooltip
				data-slot="wysiwyg-heading-back"
				variant="bare"
				label={intl.formatMessage(wysiwygMessages.back)}
				icon={<ChevronLeft className="rtl:-scale-x-100" />}
				disabled={false}
				onClick={onClose}
			/>
			<Segment value={level === null ? null : String(level)} onValueChange={handleValueChange}>
				<SegmentControl aria-label={intl.formatMessage(wysiwygMessages.headingLevel)}>
					{wysiwygHeadingLevels.map((entry) => (
						<WysiwygHeadingLevelItem key={entry.level} entry={entry} />
					))}
				</SegmentControl>
			</Segment>
		</Toolbar>
	)
}

/**
 * One level of a {@link WysiwygHeadingRail}: the short label, the full name,
 * and the shortcut of the level. It is disabled while the selection cannot
 * take the level.
 *
 * @internal
 */
function WysiwygHeadingLevelItem({ entry }: { entry: (typeof wysiwygHeadingLevels)[number] }) {
	const { subscribe, canSetHeading } = useWysiwyg()

	const intl = useIntl()

	// The server does not know the platform of the reader, so the server render
	// and the hydration render name the keys of an Apple platform.
	const apple = useHydrated() ? isApplePlatform() : true

	const enabled = useSyncExternalStore(subscribe, () => canSetHeading(entry.level), serverOpen)

	const name = intl.formatMessage(entry.message)

	const label = intl.formatMessage(entry.label)

	return (
		<SegmentItem
			value={String(entry.level)}
			aria-label={label === name ? undefined : name}
			aria-keyshortcuts={shortcutAria(entry.shortcut, apple)}
			disabled={!enabled}
		>
			{label}
		</SegmentItem>
	)
}
