import type { ComponentType } from 'react'
import {
	Code,
	Italic,
	LetterB,
	Link,
	List,
	ListOrdered,
	SquareCode,
	Strikethrough,
	TextQuote,
} from '../../primitives/icons/icons'
import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageDescriptor } from '../../primitives/intl/types'
import type { WysiwygAction } from './types'

/** @internal */
export const wysiwygMessages = defineMessages({
	toolbar: {
		id: 'ui.wysiwyg.toolbar',
		defaultMessage: 'Formatting',
		description: 'The name of the toolbar of buttons that format the text of a rich text field.',
	},
	text: {
		id: 'ui.wysiwyg.text',
		defaultMessage: 'Text',
		description:
			'The name of the group of toolbar buttons that format the selected text, such as Bold.',
	},
	references: {
		id: 'ui.wysiwyg.references',
		defaultMessage: 'References',
		description:
			'The name of the group of toolbar buttons that bring in outside material, such as Link and Quote.',
	},
	lists: {
		id: 'ui.wysiwyg.lists',
		defaultMessage: 'Lists',
		description:
			'The name of the group of toolbar buttons that make the current block a list, such as Bulleted list.',
	},
	codeGroup: {
		id: 'ui.wysiwyg.codeGroup',
		defaultMessage: 'Code',
		description:
			'The name of the group of toolbar buttons that show text as code, such as Code block.',
	},
	linkUrl: {
		id: 'ui.wysiwyg.linkUrl',
		defaultMessage: 'URL',
		description: 'The label of the field that holds the web address of a link.',
	},
	apply: {
		id: 'ui.wysiwyg.apply',
		defaultMessage: 'Apply',
		description: 'The button that sets the link of the selected text to the typed web address.',
	},
	removeLink: {
		id: 'ui.wysiwyg.removeLink',
		defaultMessage: 'Remove link',
		description: 'The button that removes the link from the selected text.',
	},
	bold: {
		id: 'ui.wysiwyg.bold',
		defaultMessage: 'Bold',
		description: 'The name of the toolbar button that makes the selected text bold.',
	},
	italic: {
		id: 'ui.wysiwyg.italic',
		defaultMessage: 'Italic',
		description: 'The name of the toolbar button that makes the selected text italic.',
	},
	strike: {
		id: 'ui.wysiwyg.strike',
		defaultMessage: 'Strikethrough',
		description: 'The name of the toolbar button that draws a line through the selected text.',
	},
	code: {
		id: 'ui.wysiwyg.code',
		defaultMessage: 'Code',
		description: 'The name of the toolbar button that shows the selected text as inline code.',
	},
	link: {
		id: 'ui.wysiwyg.link',
		defaultMessage: 'Link',
		description: 'The name of the toolbar button that adds or edits a link on the selected text.',
	},
	bulletList: {
		id: 'ui.wysiwyg.bulletList',
		defaultMessage: 'Bulleted list',
		description: 'The name of the toolbar button that makes the current block a bulleted list.',
	},
	orderedList: {
		id: 'ui.wysiwyg.orderedList',
		defaultMessage: 'Numbered list',
		description: 'The name of the toolbar button that makes the current block a numbered list.',
	},
	quote: {
		id: 'ui.wysiwyg.quote',
		defaultMessage: 'Quote',
		description: 'The name of the toolbar button that makes the current block a quote.',
	},
	codeBlock: {
		id: 'ui.wysiwyg.codeBlock',
		defaultMessage: 'Code block',
		description: 'The name of the toolbar button that makes the current block a block of code.',
	},
})

/**
 * The keys of a shortcut: `$mod` (Command on Apple platforms, Control
 * elsewhere), the optional Shift and Alt, and the key.
 *
 * @internal
 */
export type WysiwygShortcut = { shift?: boolean; alt?: boolean; key: string }

/**
 * A group of the toolbar. The value is the key of its name in
 * {@link wysiwygGroupMessages}.
 *
 * @internal
 */
export type WysiwygActionGroup = 'text' | 'references' | 'lists' | 'code'

/**
 * The name of each group of the toolbar.
 *
 * @internal
 */
export const wysiwygGroupMessages: Record<WysiwygActionGroup, MessageDescriptor> = {
	text: wysiwygMessages.text,
	references: wysiwygMessages.references,
	lists: wysiwygMessages.lists,
	code: wysiwygMessages.codeGroup,
}

/**
 * What the toolbar shows for an action, and its shortcut. The engine holds
 * the command of each action (`engine/wysiwyg-commands.ts`), so the toolbar
 * loads without the editor. Both are keyed by {@link WysiwygAction}, so each
 * action has an entry in each.
 *
 * @internal
 */
export type WysiwygActionEntry = {
	/**
	 * The group of the action in the toolbar: `text` formats the selected
	 * text, `references` adds a link or a quote, `lists` makes a list, and
	 * `code` shows text as code.
	 */
	group: WysiwygActionGroup
	message: MessageDescriptor
	icon: ComponentType
	shortcut: WysiwygShortcut
}

/**
 * The entry of each action, in the default order of a toolbar.
 *
 * @internal
 */
export const wysiwygActions: Record<WysiwygAction, WysiwygActionEntry> = {
	bold: { group: 'text', message: wysiwygMessages.bold, icon: LetterB, shortcut: { key: 'B' } },
	italic: { group: 'text', message: wysiwygMessages.italic, icon: Italic, shortcut: { key: 'I' } },
	strike: {
		group: 'text',
		message: wysiwygMessages.strike,
		icon: Strikethrough,
		shortcut: { shift: true, key: 'X' },
	},
	link: { group: 'references', message: wysiwygMessages.link, icon: Link, shortcut: { key: 'K' } },
	quote: {
		group: 'references',
		message: wysiwygMessages.quote,
		icon: TextQuote,
		shortcut: { shift: true, key: '9' },
	},
	bulletList: {
		group: 'lists',
		message: wysiwygMessages.bulletList,
		icon: List,
		shortcut: { shift: true, key: '8' },
	},
	orderedList: {
		group: 'lists',
		message: wysiwygMessages.orderedList,
		icon: ListOrdered,
		shortcut: { shift: true, key: '7' },
	},
	code: { group: 'code', message: wysiwygMessages.code, icon: Code, shortcut: { key: 'E' } },
	codeBlock: {
		group: 'code',
		message: wysiwygMessages.codeBlock,
		icon: SquareCode,
		shortcut: { alt: true, key: 'C' },
	},
}

/**
 * Each action, in the default order of a toolbar.
 *
 * @internal
 */
export const WYSIWYG_ACTIONS = Object.keys(wysiwygActions) as WysiwygAction[]

/**
 * The `aria-keyshortcuts` value of a shortcut, such as `Meta+B` on Apple
 * platforms and `Control+Shift+X` elsewhere.
 *
 * @internal
 */
export function shortcutAria({ shift, alt, key }: WysiwygShortcut, apple: boolean): string {
	return [apple ? 'Meta' : 'Control', alt && 'Alt', shift && 'Shift', key].filter(Boolean).join('+')
}
