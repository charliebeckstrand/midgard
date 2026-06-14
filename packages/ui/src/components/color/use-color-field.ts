'use client'

import { useState } from 'react'

/**
 * Focus buffer for the colour entry fields. While a field is focused its raw
 * text lives here and shadows the derived value, preserving partially-typed
 * input such as an empty field mid-edit or a half-typed hex. One field edits
 * at a time; a single slot holds it.
 *
 * Shared by the hex input and the per-channel RGB(A) inputs. `derived` is what
 * each field shows at rest.
 *
 * @param derived - Resting text per field, keyed by field name.
 * @returns `setDraft(field, value)` to record keystrokes and `draftProps(field)`
 * to bind an `<Input>` to its buffered-or-derived `value`, seed the buffer on
 * focus, and clear it on blur.
 * @internal
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
