'use client'

import { useCallback, useState } from 'react'

/** Options for {@link useChatDraft}. */
export type UseChatDraftOptions = {
	/** Called with the trimmed draft when {@link UseChatDraft.submit} fires on non-empty input. */
	onSubmit?: (value: string) => void
	/** Seed value for the composer. @defaultValue `''` */
	initialValue?: string
}

/** Return shape of {@link useChatDraft}. */
export type UseChatDraft = {
	/** Current draft text. */
	value: string
	/** Replaces the draft (wire to a composer's `onValueChange`). */
	setValue: (value: string) => void
	/** Clears the draft. */
	clear: () => void
	/** Trims, guards against empty input, invokes `onSubmit`, then clears. */
	submit: () => void
	/** Whether the trimmed draft is non-empty (i.e. sendable). */
	canSubmit: boolean
}

/**
 * Owns a chat composer's draft text and its submit lifecycle.
 *
 * @remarks
 * Pairs with `ChatPrompt`: `value`/`setValue` drive the textarea, `submit`
 * handles send. Empty or whitespace-only drafts are suppressed; a successful
 * `submit` clears the field so the composer is ready for the next message.
 *
 * @param options - See {@link UseChatDraftOptions}.
 * @returns See {@link UseChatDraft}.
 */
export function useChatDraft({
	onSubmit,
	initialValue = '',
}: UseChatDraftOptions = {}): UseChatDraft {
	const [value, setValue] = useState(initialValue)

	const clear = useCallback(() => setValue(''), [])

	const submit = useCallback(() => {
		const content = value.trim()

		if (!content) return

		onSubmit?.(content)

		setValue('')
	}, [value, onSubmit])

	return { value, setValue, clear, submit, canSubmit: value.trim().length > 0 }
}
