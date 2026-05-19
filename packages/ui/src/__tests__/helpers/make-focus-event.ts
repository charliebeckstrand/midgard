import type { FocusEvent } from 'react'
import { vi } from 'vitest'

export function makeFocusEvent<T extends Element = Element>(
	overrides: Partial<FocusEvent<T>> = {},
): FocusEvent<T> {
	const partial: Partial<FocusEvent<T>> = {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		...overrides,
	}

	return partial as FocusEvent<T>
}
