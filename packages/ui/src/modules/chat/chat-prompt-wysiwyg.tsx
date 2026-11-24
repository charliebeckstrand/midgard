'use client'

import type { Ref } from 'react'
import { Wysiwyg, type WysiwygProps, WysiwygToolbar } from '../wysiwyg'
import type { WysiwygAction, WysiwygHandle } from '../wysiwyg/types'
import type { ChatCitation } from './engine/chat-content/types'

/** The object form of the `wysiwyg` prop of a ChatPrompt. */
export type ChatPromptWysiwygOptions = {
	/**
	 * The buttons of the formatting toolbar, in the order given.
	 * @defaultValue Each {@link WysiwygAction}, as on `WysiwygToolbar`.
	 */
	actions?: readonly WysiwygAction[]
}

/** Props for {@link ChatPromptWysiwyg}. @internal */
type ChatPromptWysiwygProps = Pick<
	WysiwygProps<ChatCitation>,
	| 'value'
	| 'ranges'
	| 'onValueChange'
	| 'rows'
	| 'placeholder'
	| 'actions'
	| 'aria-label'
	| 'aria-labelledby'
	| 'aria-describedby'
	| 'aria-autocomplete'
	| 'aria-haspopup'
	| 'aria-controls'
	| 'onKeyDown'
	| 'onSelectionChange'
> & {
	/** The `wysiwyg` prop of the ChatPrompt, when it is on. */
	config: true | ChatPromptWysiwygOptions
	/** Enter calls it. */
	onEnter: () => void
	ref?: Ref<WysiwygHandle<ChatCitation>>
}

/**
 * The field of a ChatPrompt while its `wysiwyg` prop is on: a Wysiwyg with a
 * formatting toolbar above it.
 *
 * @internal
 */
export function ChatPromptWysiwyg({ config, ...props }: ChatPromptWysiwygProps) {
	return (
		<Wysiwyg {...props} enterKeyHint="send" className="max-h-64">
			<WysiwygToolbar actions={config === true ? undefined : config.actions} />
		</Wysiwyg>
	)
}
