'use client'

import { type ReactNode, useMemo, useRef } from 'react'
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
import { useMediaQuery } from '../../hooks/use-media-query'
import { Copy, EllipsisVertical } from '../../primitives/icons/icons'
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
			'The name of the menu of a chat message, and of the button that opens it. On a touch screen, a long press on the message also opens the menu. It holds the actions of that message.',
	},
	copy: {
		id: 'ui.chat.copy',
		defaultMessage: 'Copy',
		description:
			'The item of the menu of a chat message that copies the text of the message to the clipboard.',
	},
})

/** Props for {@link ChatMessageMenu} and {@link ChatMessageMenuButton}. @internal */
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
 * with the configuration of the caller. The menu over the bubble and the menu
 * button read the same entries.
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
			icon: <Copy />,
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
 * @internal
 */
export function ChatMessageMenu({
	config,
	content,
	bubble,
	rightClick,
	children,
}: ChatMessageMenuProps & { rightClick: boolean; children: ReactNode }) {
	const { entries, name } = useMenuEntries({ config, content, bubble })

	// The wrapper stays when the menu turns off, so the bubble does not mount
	// again when the query settles after hydration.
	const touch = useMediaQuery(NO_HOVER_QUERY)

	return (
		<ContextMenu
			items={entries}
			capped={config?.capped}
			disabled={!touch && !rightClick}
			aria-label={name}
		>
			{children}
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
 * The one item of a menu that holds a single item, or `undefined` for any
 * other menu.
 *
 * @internal
 */
function loneItem(entries: ContextMenuEntry[]): ContextMenuItem | undefined {
	const [only] = entries

	if (entries.length !== 1 || only === undefined) return undefined

	return 'separator' in only || 'items' in only ? undefined : only
}

/**
 * The copy button in the toolbar, for a menu that holds Copy alone. It shows a
 * check while the copied state holds, and a live region says "Copied". The
 * check holds the toolbar open (`has-data-copied` in the kata), so the reader
 * sees it also after the pointer leaves the message.
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
		<CopyButton
			ref={ref}
			size="sm"
			icon={<Copy />}
			text={text}
			disabled={disabled}
			aria-label={label}
			onCopiedChange={(copied) => {
				if (!copied) done()
			}}
			onCopyError={done}
		/>
	)
}

/**
 * The button in the toolbar of a chat message. A menu of more than one item
 * opens as a dropdown from an ellipsis button, with the same entries as the
 * context menu of a touch screen. Thus a reader with a pointer or a keyboard
 * gets to each action. A menu of one item with an icon has no ellipsis: the
 * toolbar shows the button of that item, which runs its action at once. Copy
 * alone is a {@link CopyButton}, which shows a check after the copy.
 *
 * @internal
 */
export function ChatMessageMenuButton({
	config,
	content,
	bubble,
	sender,
}: ChatMessageMenuProps & { sender: ChatMessageData['sender'] }) {
	const { entries, copyItem, text, focusBubble, copy, name } = useMenuEntries({
		config,
		content,
		bubble,
	})

	const action = loneItem(entries)

	// Copy alone is a copy button, which shows a check after the copy.
	if (action === copyItem) {
		return <ToolbarCopy text={text} label={copy} disabled={action.disabled} onDone={focusBubble} />
	}

	// An item with no icon has nothing to draw in the toolbar, so it keeps the menu.
	if (action?.icon) {
		return (
			<Button
				type="button"
				variant="bare"
				size="sm"
				disabled={action.disabled}
				onClick={action.onAction}
			>
				<Icon icon={action.icon} />
				<span className="sr-only">{action.label}</span>
			</Button>
		)
	}

	return (
		<Menu placement={MENU_PLACEMENT[sender]} capped={config?.capped}>
			<MenuTrigger>
				<Button type="button" variant="bare" size="sm" aria-label={name}>
					<Icon icon={<EllipsisVertical />} />
				</Button>
			</MenuTrigger>

			<MenuContent>
				<ContextMenuList entries={entries} />
			</MenuContent>
		</Menu>
	)
}
