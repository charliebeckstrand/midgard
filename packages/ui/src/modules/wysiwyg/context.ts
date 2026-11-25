'use client'

import { createContext } from '../../core/create-context'
import type { WysiwygAction, WysiwygHeadingLevel, WysiwygToggleAction } from './types'

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
	/**
	 * Gives the text blocks of the selection a level of the heading rail.
	 * Before the editor loads, it starts the load, and the level is set when
	 * the editor comes.
	 */
	setHeading: (level: WysiwygHeadingLevel) => void
	/** The level of the heading rail that the selection has, or `null`. */
	headingLevel: () => WysiwygHeadingLevel | null
	/**
	 * Whether a level of the heading rail can apply to the selection: the
	 * selection has the level, or the text blocks of the selection can take it.
	 */
	canSetHeading: (level: WysiwygHeadingLevel) => boolean
	/**
	 * Runs a task now, or, before the editor loads, starts the load and runs
	 * the task when the editor comes.
	 */
	whenReady: (task: () => void) => void
	/**
	 * Adds the opener of a link dialog while its button is mounted. The link
	 * shortcut calls the opener of the last button that mounted, and goes on
	 * as a key with no button.
	 *
	 * @returns The release of the opener.
	 */
	registerLink: (open: () => void) => () => void
	/** The text and the URL of the selection, or of the link at a caret. */
	linkDraft: () => { text: string; href: string }
	/**
	 * Sets the text and the link of the selection, or of the link at a caret.
	 * An empty URL removes the link.
	 */
	setLink: (href: string, text: string) => void
	/**
	 * Marks the selection while the focus is in the link dialog, or removes
	 * the mark with `false`.
	 */
	holdSelection: (held: boolean) => void
	/** Whether the field has the focus. */
	fieldFocused: () => boolean
	/**
	 * Moves the focus to the field, and draws its selection at once. A plain
	 * focus of the element draws the selection of the editor some time later.
	 */
	focusField: () => void
}

export const [WysiwygContext, useWysiwyg] = createContext<WysiwygContextValue>('Wysiwyg')
