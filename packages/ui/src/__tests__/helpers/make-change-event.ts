import type { ChangeEvent } from 'react'
import { vi } from 'vitest'

export function makeChangeEvent<T extends Element = HTMLInputElement>(
	overrides: Partial<ChangeEvent<T>> = {},
): ChangeEvent<T> {
	const partial: Partial<ChangeEvent<T>> = {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		...overrides,
	}

	return partial as ChangeEvent<T>
}
