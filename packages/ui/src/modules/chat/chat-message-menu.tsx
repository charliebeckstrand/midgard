'use client'

import { Copy, EllipsisVertical } from 'lucide-react'
import { cloneElement, type ReactElement, useMemo, useRef } from 'react'
import { Button } from '../../components/button'
import { ContextMenu, ContextMenuList } from '../../components/context-menu'
import { resolveContextMenuEntries } from '../../components/context-menu/context-menu-merge'
import type {
	ContextMenuConfig,
	ContextMenuEntry,
	ContextMenuItem,
} from '../../components/context-menu/types'
import { CopyButton } from '../../components/copy-button'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuTrigger } from '../../components/menu'
import { Toolbar } from '../../components/toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { useMediaQuery } from '../../hooks/use-media-query'
import { Glyph } from '../../primitives/glyph'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { copyText } from '../../utilities/export-output'
import { NO_HOVER_QUERY } from '../../utilities/media-query'
import { chatContentText } from './engine/chat-content/text'
import type { ChatPart } from './engine/chat-content/types'
import type { ChatMessageData } from './engine/types'

/** @internal */
const messages = defineMessages({
	menu: {
		id: 'ui.chat.messageActions',
		defaultMessage: 'Message actions',
		description:
			'The name of the menu of a chat message, of its toolbar, and of the button that opens the menu when the toolbar shows no action buttons. On a touch screen, a long press on the message also opens the menu. It holds the actions of that message.',
	},
	more: {
		id: 'ui.chat.moreActions',
		defaultMessage: 'More actions',
		description:
			'The name of the button in the toolbar of a chat message that opens a menu of the actions that do not fit in the toolbar. The toolbar shows the first actions as icon buttons before it.',
	},
	copy: {
		id: 'ui.chat.copy',
		defaultMessage: 'Copy',
		description:
			'The item of the menu of a chat message that copies the text of the message to the clipboard.',
	},
})

/** Props for {@link ChatMessageMenu} and {@link ChatMessageToolbar}. @internal */
type ChatMessageMenuProps = {
	/** The configuration of the caller. `undefined` shows the default items alone. */
	config: ContextMenuConfig | undefined
	/** The content of the message, which the Copy item copies. */
	content: string | ChatPart[]
	/** The id of the bubble of the message, which takes the focus after a copy. */
	bubble: string
}

/**
 * The entries of the menu of a chat message: the default Copy item, merged
 * with the configuration of the caller. The menu over the bubble and the
 * toolbar read the same entries.
 *
 * @internal
 */
function useMenuEntries({ config, content, bubble }: ChatMessageMenuProps): {
	entries: ContextMenuEntry[]
	/** The default Copy item, so the toolbar can tell it from an item of the caller. */
	copyItem: ContextMenuItem
	/** The plain text of the message, which Copy copies. */
	text: string
	/** Moves the focus to the bubble. */
	focusBubble: () => void
	/** The name of the Copy item. */
	copy: string
	name: string
} {
	const intl = useIntl()

	const copy = intl.formatMessage(messages.copy)

	const name = intl.formatMessage(messages.menu)

	const items = config?.items

	const defaultItems = config?.defaultItems

	const insert = config?.insert

	// The plain-text projection that the announcer and `retry` also read. A
	// message with no text yet, such as a reply that waits, has nothing to copy.
	const text = useMemo(() => chatContentText(content), [content])

	const { entries, copyItem, focusBubble } = useMemo(() => {
		// The focus goes to the bubble, and not to the button in the toolbar. The
		// next Tab thus goes into the controls of the message again. The menu keeps
		// the focus on an element that an action focused.
		const focusBubble = () => document.getElementById(bubble)?.focus({ preventScroll: true })

		const copyItem: ContextMenuItem = {
			key: 'copy',
			label: copy,
			icon: <Glyph icon={Copy} />,
			disabled: text === '',
			onAction: () => {
				copyText(text)

				focusBubble()
			},
		}

		const entries = resolveContextMenuEntries({ items, defaultItems, insert }, [copyItem])

		return { entries, copyItem, focusBubble }
	}, [text, copy, items, defaultItems, insert, bubble])

	return { entries, copyItem, text, focusBubble, copy, name }
}

/**
 * The context menu of a chat message, over its bubble. On a device with no
 * hover, a touch long press opens it. A device that hovers shows the toolbar
 * on a hover of the bubble, so there a right-click keeps the native menu of
 * the browser, unless `rightClick` opens the menu there too.
 *
 * Where the menu opens over the bubble, the bubble is a tab stop, so a keyboard
 * opens the menu with the ContextMenu key or Shift+F10. That is the only path
 * of a keyboard to the menu on a device with no hover, which has no toolbar.
 * Elsewhere the bubble keeps the `tabIndex` of the caller.
 *
 * @internal
 */
export function ChatMessageMenu({
	config,
	content,
	bubble,
	rightClick,
	children,
}: ChatMessageMenuProps & {
	rightClick: boolean
	children: ReactElement<{ tabIndex?: number }>
}) {
	const { entries, name } = useMenuEntries({ config, content, bubble })

	// The wrapper stays when the menu turns off, so the bubble does not mount
	// again when the query settles after hydration.
	const touch = useMediaQuery(NO_HOVER_QUERY)

	const on = touch || rightClick

	return (
		<ContextMenu items={entries} capped={config?.capped} disabled={!on} aria-label={name}>
			{on && entries.length > 0 ? cloneElement(children, { tabIndex: 0 }) : children}
		</ContextMenu>
	)
}

/**
 * Where the dropdown opens, on the side of the speaker, as the message and its
 * toolbar align. A reply aligns to the start and the reader's own message to
 * the end. A system line is centered.
 *
 * @internal
 */
const MENU_PLACEMENT = {
	user: 'bottom-end',
	assistant: 'bottom-start',
	system: 'bottom',
} as const satisfies Record<ChatMessageData['sender'], string>

/**
 * The most actions that the toolbar shows as icon buttons. The menu button
 * holds the other entries.
 *
 * @internal
 */
const INLINE_LIMIT = 3

/** An item that the toolbar shows as an icon button. @internal */
type InlineItem = ContextMenuItem & { icon: ReactElement }

/** Whether an entry is an item with an icon, which the toolbar can show. @internal */
function isInlineItem(entry: ContextMenuEntry): entry is InlineItem {
	return !('separator' in entry) && !('items' in entry) && entry.icon !== undefined
}

/**
 * Splits the entries of a menu between the toolbar and the menu button. The
 * toolbar takes the first entries, up to {@link INLINE_LIMIT}, while each is an
 * item with an icon. A separator between two of them goes. A submenu or an item
 * with no icon has nothing to draw as an icon button, so it and each entry after
 * it stay in the menu. Thus the order of the entries holds. The menu does not
 * start with a separator.
 *
 * @internal
 */
function splitToolbarEntries(entries: ContextMenuEntry[]): {
	inline: InlineItem[]
	rest: ContextMenuEntry[]
} {
	const inline: InlineItem[] = []

	let index = 0

	for (; index < entries.length && inline.length < INLINE_LIMIT; index++) {
		const entry = entries[index] as ContextMenuEntry

		if ('separator' in entry) continue

		if (!isInlineItem(entry)) break

		inline.push(entry)
	}

	while (index < entries.length && 'separator' in (entries[index] as ContextMenuEntry)) index++

	return { inline, rest: entries.slice(index) }
}

/**
 * The copy button in the toolbar. It shows a check while the copied state
 * holds, and a live region says "Copied". The tooltip names the action, so it
 * says the label of the item also in that time: the check is the visual
 * confirmation. The check holds the toolbar open (`has-data-copied` in the
 * kata), so the reader sees it also after the pointer leaves the message.
 *
 * When the check goes, the focus goes to the bubble, as after the Copy item of
 * the menu. The next Tab thus goes into the toolbar again. The focus moves at
 * the end of the copy, and not at the press, so the button that the reader
 * pressed keeps the focus while it shows the result. A copy that fails shows
 * no check, so the focus moves at once. The focus moves only while it is still
 * on the button, so a reader who moved on keeps the focus.
 *
 * @internal
 */
function ToolbarCopy({
	text,
	label,
	disabled,
	onDone,
}: {
	text: string
	label: string
	disabled: boolean | undefined
	onDone: () => void
}) {
	const ref = useRef<HTMLButtonElement>(null)

	const done = () => {
		if (document.activeElement === ref.current) onDone()
	}

	return (
		<Tooltip>
			<TooltipTrigger>
				{/* The tooltip echoes the accessible name, so the trigger takes no
				    description that repeats it. */}
				<CopyButton
					ref={ref}
					aria-describedby={undefined}
					size="sm"
					icon={<Glyph icon={Copy} />}
					text={text}
					disabled={disabled}
					aria-label={label}
					onCopiedChange={(copied) => {
						if (!copied) done()
					}}
					onCopyError={done}
				/>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

/**
 * An action of the caller in the toolbar: an icon button with the label of the
 * item as its name and its tooltip. A press runs the action at once.
 *
 * @internal
 */
function ToolbarAction({ item }: { item: InlineItem }) {
	return (
		<Tooltip>
			<TooltipTrigger>
				{/* The tooltip echoes the accessible name, so the trigger takes no
				    description that repeats it. */}
				<Button
					type="button"
					variant="bare"
					size="sm"
					aria-describedby={undefined}
					disabled={item.disabled}
					onClick={item.onAction}
				>
					<Icon icon={item.icon} />
					<span className="sr-only">{item.label}</span>
				</Button>
			</TooltipTrigger>
			<TooltipContent>{item.label}</TooltipContent>
		</Tooltip>
	)
}

/**
 * The toolbar of a chat message, on a device that hovers. It shows the first
 * actions of the menu as icon buttons, up to three, each with a tooltip. An
 * ellipsis button opens a dropdown with the other entries, the same entries
 * as the context menu of a touch screen has after them. A menu of three items
 * or fewer, each with an icon, has no ellipsis. Thus a reader with a pointer or
 * a keyboard gets to each action. Copy is a {@link CopyButton}, which shows a
 * check after the copy.
 *
 * The toolbar is a {@link Toolbar}, so it is one Tab stop, and the arrow keys
 * move between its buttons. The ellipsis is named "Message actions" when it is
 * the only button, and "More actions" after icon buttons.
 *
 * @internal
 */
export function ChatMessageToolbar({
	config,
	content,
	bubble,
	sender,
}: ChatMessageMenuProps & { sender: ChatMessageData['sender'] }) {
	const intl = useIntl()

	const { entries, copyItem, text, focusBubble, copy, name } = useMenuEntries({
		config,
		content,
		bubble,
	})

	const { inline, rest } = useMemo(() => splitToolbarEntries(entries), [entries])

	const more = inline.length > 0 ? intl.formatMessage(messages.more) : name

	return (
		<Toolbar aria-label={name}>
			{inline.map((item, index) =>
				item === copyItem ? (
					<ToolbarCopy
						key={item.key}
						text={text}
						label={copy}
						disabled={item.disabled}
						onDone={focusBubble}
					/>
				) : (
					<ToolbarAction key={item.key ?? index} item={item} />
				),
			)}
			{rest.length > 0 && (
				<Menu placement={MENU_PLACEMENT[sender]} capped={config?.capped}>
					<Tooltip>
						<TooltipTrigger>
							{/* The tooltip echoes the accessible name, so the trigger takes no
							    description that repeats it. */}
							<MenuTrigger aria-describedby={undefined}>
								<Button type="button" variant="bare" size="sm" aria-label={more}>
									<Icon icon={EllipsisVertical} />
								</Button>
							</MenuTrigger>
						</TooltipTrigger>
						<TooltipContent>{more}</TooltipContent>
					</Tooltip>

					<MenuContent>
						<ContextMenuList entries={rest} />
					</MenuContent>
				</Menu>
			)}
		</Toolbar>
	)
}
