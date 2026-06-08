import type { KeyboardEvent } from 'react'
import { vi } from 'vitest'

/**
 * Build a synthetic React KeyboardEvent for hooks/handlers that accept one
 * directly. `preventDefault` and `stopPropagation` are `vi.fn()` spies.
 * Calling `preventDefault()` flips `defaultPrevented` to true, matching real
 * DOM behavior — handlers that branch on `event.defaultPrevented` (e.g.
 * `useCalendarFocus`) can be tested accurately.
 */
export function makeKeyEvent<T extends Element = Element>(
	key: string,
	overrides: Partial<KeyboardEvent<T>> = {},
): KeyboardEvent<T> {
	const partial: Partial<KeyboardEvent<T>> & { defaultPrevented: boolean } = {
		key,
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		stopPropagation: vi.fn(),
		defaultPrevented: false,
		nativeEvent: { isComposing: false } as KeyboardEvent<T>['nativeEvent'],
		...overrides,
	}

	if (!overrides.preventDefault) {
		partial.preventDefault = vi.fn(() => {
			partial.defaultPrevented = true
		})
	}

	return partial as KeyboardEvent<T>
}
