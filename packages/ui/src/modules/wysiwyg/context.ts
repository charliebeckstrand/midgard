'use client'

import { createContext } from '../../core/create-context'
import type { WysiwygAction } from './types'

/**
 * What a {@link Wysiwyg} gives its parts, such as {@link WysiwygToolbar}.
 *
 * @internal
 */
export type WysiwygContextValue = {
	/** The id of the editable field, which the toolbar controls. */
	fieldId: string
	/** Whether the editor has loaded. Before it loads, no action runs. */
	ready: boolean
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
	/** Runs an action on the selection. */
	run: (action: WysiwygAction) => void
	/** Whether the link popover is open. */
	linkOpen: boolean
	setLinkOpen: (open: boolean) => void
	/**
	 * Counts a link button of a toolbar while it is mounted. The link shortcut
	 * opens the popover only while the field has one.
	 *
	 * @returns The release of the count.
	 */
	registerLink: () => () => void
	/** The URL of the link at the selection, or an empty string. */
	linkHref: () => string
	/** Sets a link on the selection, or removes it with an empty URL. */
	setLink: (href: string) => void
}

export const [WysiwygContext, useWysiwyg] = createContext<WysiwygContextValue>('Wysiwyg')
