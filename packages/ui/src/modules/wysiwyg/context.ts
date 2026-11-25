'use client'

import { createContext } from '../../core/create-context'
import type { WysiwygAction, WysiwygToggleAction } from './types'

/**
 * What a {@link Wysiwyg} gives its parts, such as {@link WysiwygToolbar}.
 *
 * @internal
 */
export type WysiwygContextValue = {
	/** The id of the editable field, which the toolbar controls. */
	fieldId: string
	/** Whether the field takes no edit, because it is disabled or read-only. */
	locked: boolean
	/**
	 * The classes of the toolbar, which the surface of the field and
	 * `separated` set.
	 */
	toolbarClassName: string
	/** Subscribes to each new state of the editor. */
	subscribe: (listener: () => void) => () => void
	/** Whether an action is on at the selection. */
	isActive: (action: WysiwygAction) => boolean
	/**
	 * Runs a toggle action on the selection. Before the editor loads, it starts
	 * the load, and the action runs when the editor comes.
	 */
	run: (action: WysiwygToggleAction) => void
	/** Whether the link popover is open. */
	linkOpen: boolean
	/**
	 * Opens or closes the link popover. Before the editor loads, an open starts
	 * the load, and the popover opens when the editor comes.
	 */
	setLinkOpen: (open: boolean) => void
	/**
	 * Counts a link button of a toolbar while it is mounted. The link shortcut
	 * opens the popover only while the field has one.
	 *
	 * @returns The release of the count.
	 */
	registerLink: () => () => void
	/** The text and the URL of the selection, or of the link at a caret. */
	linkDraft: () => { text: string; href: string }
	/**
	 * Sets the text and the link of the selection, or of the link at a caret.
	 * An empty URL removes the link.
	 */
	setLink: (href: string, text: string) => void
	/**
	 * Marks the selection while the focus is in the link popover, or removes
	 * the mark with `false`.
	 */
	holdSelection: (held: boolean) => void
	/** Whether the field has the focus. */
	fieldFocused: () => boolean
	/** Moves the focus to the field, which shows its selection again. */
	focusField: () => void
}

export const [WysiwygContext, useWysiwyg] = createContext<WysiwygContextValue>('Wysiwyg')
