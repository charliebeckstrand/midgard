import type { PointerEvent } from 'react'
import { vi } from 'vitest'

/**
 * Build a synthetic React PointerEvent. `preventDefault` / `stopPropagation`
 * are `vi.fn()` spies by default. The cast is local to this helper; call
 * sites stay typed.
 */
export function makePointerEvent<T extends Element = Element>(
	overrides: Partial<PointerEvent<T>> = {},
): PointerEvent<T> {
	const partial: Partial<PointerEvent<T>> = {
		button: 0,
		clientX: 0,
		clientY: 0,
		pointerId: 1,
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		...overrides,
	}

	return partial as PointerEvent<T>
}
