import type { ComponentType } from 'react'
import { Code } from '../../primitives/icons/glyphs/glyph-code'
import { Italic } from '../../primitives/icons/glyphs/glyph-italic'
import { LetterB } from '../../primitives/icons/glyphs/glyph-letter-b'
import { LetterH } from '../../primitives/icons/glyphs/glyph-letter-h'
import { Link } from '../../primitives/icons/glyphs/glyph-link'
import { List } from '../../primitives/icons/glyphs/glyph-list'
import { ListOrdered } from '../../primitives/icons/glyphs/glyph-list-ordered'
import { SquareCode } from '../../primitives/icons/glyphs/glyph-square-code'
import { Strikethrough } from '../../primitives/icons/glyphs/glyph-strikethrough'
import { TextQuote } from '../../primitives/icons/glyphs/glyph-text-quote'
import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageDescriptor } from '../../primitives/intl/types'
import type { WysiwygAction, WysiwygHeadingLevel, WysiwygToggleAction } from './types'

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
	linkText: {
		id: 'ui.wysiwyg.linkText',
		defaultMessage: 'Text',
		description: 'The label of the field that holds the text that a link shows.',
	},
	linkUrl: {
		id: 'ui.wysiwyg.linkUrl',
		defaultMessage: 'URL',
		description: 'The label of the field that holds the web address of a link.',
	},
	apply: {
		id: 'ui.wysiwyg.apply',
		defaultMessage: 'Apply',
		description: 'The button that sets the text and the web address of a link.',
	},
	removeLink: {
		id: 'ui.wysiwyg.removeLink',
		defaultMessage: 'Remove link',
		description: 'The button that removes the link from the selected text.',
	},
	heading: {
		id: 'ui.wysiwyg.heading',
		defaultMessage: 'Heading',
		description:
			'The name of the toolbar button that opens the heading levels of the current block, and the name of the row of those levels.',
	},
	headingLevel: {
		id: 'ui.wysiwyg.headingLevel',
		defaultMessage: 'Heading level',
		description:
			'The name of the group of choices that set the heading level of the current block: Text, H1, H2, and H3.',
	},
	back: {
		id: 'ui.wysiwyg.back',
		defaultMessage: 'Back',
		description:
			'The name of the button that closes the row of heading levels and shows the formatting buttons again.',
	},
	paragraph: {
		id: 'ui.wysiwyg.paragraph',
		defaultMessage: 'Text',
		description:
			'The heading level choice that makes the current block plain body text, and not a heading.',
	},
	heading1: {
		id: 'ui.wysiwyg.heading1',
		defaultMessage: 'Heading 1',
		description: 'The name of the choice that makes the current block a heading of level 1.',
	},
	heading2: {
		id: 'ui.wysiwyg.heading2',
		defaultMessage: 'Heading 2',
		description: 'The name of the choice that makes the current block a heading of level 2.',
	},
	heading3: {
		id: 'ui.wysiwyg.heading3',
		defaultMessage: 'Heading 3',
		description: 'The name of the choice that makes the current block a heading of level 3.',
	},
	heading1Short: {
		id: 'ui.wysiwyg.heading1Short',
		defaultMessage: 'H1',
		description: 'The short visible label of the choice for a heading of level 1.',
	},
	heading2Short: {
		id: 'ui.wysiwyg.heading2Short',
		defaultMessage: 'H2',
		description: 'The short visible label of the choice for a heading of level 2.',
	},
	heading3Short: {
		id: 'ui.wysiwyg.heading3Short',
		defaultMessage: 'H3',
		description: 'The short visible label of the choice for a heading of level 3.',
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
export type WysiwygActionGroup = 'heading' | 'text' | 'lists' | 'references' | 'code'

/**
 * The name of each group of the toolbar.
 *
 * @internal
 */
export const wysiwygGroupMessages: Record<WysiwygActionGroup, MessageDescriptor> = {
	heading: wysiwygMessages.heading,
	text: wysiwygMessages.text,
	lists: wysiwygMessages.lists,
	references: wysiwygMessages.references,
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
type WysiwygActionEntry = {
	/**
	 * The group of the action in the toolbar: `heading` sets the heading level,
	 * `text` formats the selected text, `lists` makes a list, `references`
	 * adds a link or a quote, and `code` shows text as code.
	 */
	group: WysiwygActionGroup
	message: MessageDescriptor
	icon: ComponentType
	/** The shortcut of the action. Heading has none: each level has its own. */
	shortcut?: WysiwygShortcut
}

/**
 * The entry of each action, in the default order of a toolbar.
 *
 * @internal
 */
export const wysiwygActions: Record<WysiwygAction, WysiwygActionEntry> = {
	heading: { group: 'heading', message: wysiwygMessages.heading, icon: LetterH },
	bold: { group: 'text', message: wysiwygMessages.bold, icon: LetterB, shortcut: { key: 'B' } },
	italic: { group: 'text', message: wysiwygMessages.italic, icon: Italic, shortcut: { key: 'I' } },
	strike: {
		group: 'text',
		message: wysiwygMessages.strike,
		icon: Strikethrough,
		shortcut: { shift: true, key: 'X' },
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
	link: { group: 'references', message: wysiwygMessages.link, icon: Link, shortcut: { key: 'K' } },
	quote: {
		group: 'references',
		message: wysiwygMessages.quote,
		icon: TextQuote,
		shortcut: { shift: true, key: '9' },
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
 * The level choices of the heading rail, in order: the name, the visible
 * label, and the shortcut of each. The shortcut of a level is `$mod+Alt` and
 * the number of the level, as in Google Docs and Notion, and `0` makes text.
 *
 * @internal
 */
export const wysiwygHeadingLevels: readonly {
	level: WysiwygHeadingLevel
	message: MessageDescriptor
	label: MessageDescriptor
	shortcut: WysiwygShortcut
}[] = [
	{
		level: 0,
		message: wysiwygMessages.paragraph,
		label: wysiwygMessages.paragraph,
		shortcut: { alt: true, key: '0' },
	},
	{
		level: 1,
		message: wysiwygMessages.heading1,
		label: wysiwygMessages.heading1Short,
		shortcut: { alt: true, key: '1' },
	},
	{
		level: 2,
		message: wysiwygMessages.heading2,
		label: wysiwygMessages.heading2Short,
		shortcut: { alt: true, key: '2' },
	},
	{
		level: 3,
		message: wysiwygMessages.heading3,
		label: wysiwygMessages.heading3Short,
		shortcut: { alt: true, key: '3' },
	},
]

/**
 * Each shortcut of the editor: the shortcut of each action, and of each
 * heading level. A key before the editor loads is held when it is one of them.
 *
 * @internal
 */
export const WYSIWYG_SHORTCUTS: readonly WysiwygShortcut[] = [
	...WYSIWYG_ACTIONS.flatMap((action) => wysiwygActions[action].shortcut ?? []),
	...wysiwygHeadingLevels.map((entry) => entry.shortcut),
]

/**
 * The `aria-keyshortcuts` value of a shortcut, such as `Meta+B` on Apple
 * platforms and `Control+Shift+X` elsewhere.
 *
 * @internal
 */
export function shortcutAria({ shift, alt, key }: WysiwygShortcut, apple: boolean): string {
	return [apple ? 'Meta' : 'Control', alt && 'Alt', shift && 'Shift', key].filter(Boolean).join('+')
}

/**
 * The action of a format input, such as the Bold item of the edit menu of iOS.
 * Markdown has no underline, so `formatUnderline` has none.
 *
 * @internal
 */
export function formatAction(inputType: string): WysiwygToggleAction | undefined {
	switch (inputType) {
		case 'formatBold':
			return 'bold'
		case 'formatItalic':
			return 'italic'
		case 'formatStrikeThrough':
			return 'strike'
		default:
			return undefined
	}
}
