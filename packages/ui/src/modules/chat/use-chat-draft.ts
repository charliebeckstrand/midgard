'use client'

import { useCallback, useState } from 'react'
import type { ChatCitation } from './engine/chat-content/types'
import { canSubmitDraft, draftCitations, draftContent } from './engine/chat-draft/content'
import { rebaseCitations } from './engine/chat-draft/rebase'

/** Options for {@link useChatDraft}. */
export type ChatDraftOptions = {
	/**
	 * Called with the trimmed draft when {@link ChatDraft.submit} fires on
	 * non-empty input. `citations` address the trimmed text, so give both to
	 * `send` of `useChatSend`.
	 */
	onSubmit?: (value: string, citations: readonly ChatCitation[]) => void
	/** Seed value for the composer. @defaultValue `''` */
	initialValue?: string
}

/** Return shape of {@link useChatDraft}. */
export type ChatDraft = {
	/** Current draft text. */
	value: string
	/**
	 * The citations of the draft: phrases of `value` that the app or a picker
	 * constructed, such as a dataset that scopes the question. Each one
	 * addresses `value` by offset. Give them to the `citations` of `ChatPrompt`.
	 */
	citations: readonly ChatCitation[]
	/**
	 * Replaces the draft (wire to a composer's `onValueChange`).
	 *
	 * @remarks
	 * With `citations`, the draft takes them as they are. `ChatPrompt` gives
	 * them, because it reads the caret of the change. With no `citations`, the
	 * draft moves its own citations across the change, and a citation that the
	 * change touches dissolves into prose. Pass a value and its citations to
	 * seed a scoped question, such as from an "Ask about this" button.
	 */
	setValue: (value: string, citations?: readonly ChatCitation[]) => void
	/** Clears the draft and its citations. */
	clear: () => void
	/** Trims, guards against empty input, invokes `onSubmit`, then clears. */
	submit: () => void
	/** Whether the trimmed draft is non-empty (i.e. sendable). */
	canSubmit: boolean
}

/** The state of a draft: its text and the citations that address it. @internal */
type DraftState = { value: string; citations: readonly ChatCitation[] }

const EMPTY_DRAFT: DraftState = { value: '', citations: [] }

/**
 * Owns a chat composer's draft text, its citations, and its submit lifecycle.
 *
 * @remarks
 * Pairs with `ChatPrompt`: `value`, `citations`, and `setValue` drive the
 * textarea, and `submit` handles send. Empty or whitespace-only drafts are
 * suppressed; a successful `submit` clears the field so the composer is ready
 * for the next message.
 *
 * The text and its citations are one state, so a change of the text and the
 * move of its citations cannot come apart.
 *
 * @param options - See {@link ChatDraftOptions}.
 * @returns See {@link ChatDraft}.
 */
export function useChatDraft({ onSubmit, initialValue = '' }: ChatDraftOptions = {}): ChatDraft {
	const [draft, setDraft] = useState<DraftState>(() => ({ value: initialValue, citations: [] }))

	const setValue = useCallback((value: string, citations?: readonly ChatCitation[]) => {
		setDraft((prev) => ({
			value,
			citations: citations ?? rebaseCitations(prev.value, value, prev.citations),
		}))
	}, [])

	const clear = useCallback(() => setDraft(EMPTY_DRAFT), [])

	const submit = useCallback(() => {
		const content = draftContent(draft.value)

		if (!content) return

		onSubmit?.(content, draftCitations(draft.value, draft.citations))

		setDraft(EMPTY_DRAFT)
	}, [draft, onSubmit])

	return {
		value: draft.value,
		citations: draft.citations,
		setValue,
		clear,
		submit,
		canSubmit: canSubmitDraft(draft.value),
	}
}
