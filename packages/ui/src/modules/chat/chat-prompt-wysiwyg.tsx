'use client'

import type { Ref } from 'react'
import { isComposing } from '../../utilities/is-composing'
import { Wysiwyg, type WysiwygProps, WysiwygToolbar } from '../wysiwyg'
import type { WysiwygAction, WysiwygHandle } from '../wysiwyg/types'

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
	WysiwygProps,
	| 'value'
	| 'rows'
	| 'placeholder'
	| 'actions'
	| 'aria-label'
	| 'aria-labelledby'
	| 'aria-describedby'
> & {
	/** The `wysiwyg` prop of the ChatPrompt, when it is on. */
	config: true | ChatPromptWysiwygOptions
	/** Fires with the Markdown of the field after each edit. */
	onValueChange: (value: string) => void
	/** Enter calls it. */
	onEnter: () => void
	/** Escape calls it, outside an IME composition. */
	onEscape?: () => void
	ref?: Ref<WysiwygHandle>
}

/**
 * The field of a ChatPrompt while its `wysiwyg` prop is on: a Wysiwyg with a
 * formatting toolbar above it.
 *
 * @internal
 */
export function ChatPromptWysiwyg({ config, onEnter, onEscape, ...props }: ChatPromptWysiwygProps) {
	return (
		<Wysiwyg
			{...props}
			onEnter={onEnter}
			onKeyDown={(event) => {
				if (event.key !== 'Escape' || !onEscape || isComposing(event)) return

				// The press is consumed, so an enclosing dialog does not close on it.
				event.preventDefault()

				onEscape()
			}}
			enterKeyHint="send"
			className="max-h-64"
		>
			<WysiwygToolbar actions={config === true ? undefined : config.actions} />
		</Wysiwyg>
	)
}
