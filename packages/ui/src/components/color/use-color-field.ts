'use client'

import { useState } from 'react'

/**
 * Focus buffer for the colour entry fields. While a field is focused its raw
 * text lives here so partially-typed input — an empty field mid-edit, a
 * half-typed hex — isn't overwritten by the derived value under the cursor.
 * Only one field edits at a time, so a single slot suffices.
 *
 * Shared by the hex input and the per-channel RGB(A) inputs. `derived` is what
 * each field shows at rest; `setDraft` records keystrokes; `draftProps` binds an
 * `<Input>` to its buffered-or-derived text and clears the buffer on blur.
 */
export function useColorField<F extends string>(derived: Record<F, string>) {
	const [edit, setEdit] = useState<{ field: F; value: string } | null>(null)

	const valueFor = (field: F) => (edit?.field === field ? edit.value : derived[field])

	return {
		setDraft: (field: F, value: string) => setEdit({ field, value }),
		draftProps: (field: F) => ({
			value: valueFor(field),
			onFocus: () => setEdit({ field, value: derived[field] }),
			onBlur: () => setEdit(null),
		}),
	}
}
