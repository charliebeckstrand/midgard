import type { KeyboardEvent } from 'react'
import { vi } from 'vitest'

/**
 * Build a synthetic React KeyboardEvent for hooks/handlers that accept one
 * directly. `preventDefault` and `stopPropagation` are `vi.fn()` spies, so
 * tests can assert against them via `event.preventDefault`. Calling
 * `preventDefault()` flips `defaultPrevented` to true, matching real DOM
 * behavior — handlers that branch on `event.defaultPrevented` (e.g.
 * `useCalendarFocus`) would otherwise diverge from production.
 */
export function makeKeyEvent<T extends Element = Element>(
	key: string,
	overrides: Partial<KeyboardEvent<T>> = {},
): KeyboardEvent<T> {
	const event = {
		key,
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		stopPropagation: vi.fn(),
		defaultPrevented: false,
		nativeEvent: { isComposing: false },
		...overrides,
	} as unknown as KeyboardEvent<T> & { defaultPrevented: boolean }

	if (!overrides.preventDefault) {
		event.preventDefault = vi.fn(() => {
			event.defaultPrevented = true
		})
	}

	return event
}
