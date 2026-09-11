import type { ChangeEvent, FocusEvent, KeyboardEvent, PointerEvent, SyntheticEvent } from 'react'
import { vi } from 'vitest'

/**
 * Build a synthetic React event for a hook or handler that accepts one
 * directly. `preventDefault` and `stopPropagation` are `vi.fn()` spies; the
 * cast is local to this helper, so call sites stay typed. The named builders
 * below add the defaults their event kind needs.
 */
function makeSyntheticEvent<E extends SyntheticEvent>(overrides: Partial<E> = {}): E {
	const partial: Partial<SyntheticEvent> = {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		...overrides,
	}

	return partial as E
}

export function makeChangeEvent<T extends Element = HTMLInputElement>(
	overrides: Partial<ChangeEvent<T>> = {},
): ChangeEvent<T> {
	return makeSyntheticEvent<ChangeEvent<T>>(overrides)
}

export function makeFocusEvent<T extends Element = Element>(
	overrides: Partial<FocusEvent<T>> = {},
): FocusEvent<T> {
	return makeSyntheticEvent<FocusEvent<T>>(overrides)
}

/** A primary-button pointer event at the origin, pointer id 1. */
export function makePointerEvent<T extends Element = Element>(
	overrides: Partial<PointerEvent<T>> = {},
): PointerEvent<T> {
	return makeSyntheticEvent<PointerEvent<T>>({
		button: 0,
		clientX: 0,
		clientY: 0,
		pointerId: 1,
		...overrides,
	})
}

/**
 * A keyboard event for `key` with no modifier held. Calling `preventDefault()`
 * flips `defaultPrevented` to true, matching real DOM behavior.
 */
export function makeKeyEvent<T extends Element = Element>(
	key: string,
	overrides: Partial<KeyboardEvent<T>> = {},
): KeyboardEvent<T> {
	const event = makeSyntheticEvent<KeyboardEvent<T> & { defaultPrevented: boolean }>({
		key,
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		defaultPrevented: false,
		nativeEvent: { isComposing: false } as KeyboardEvent<T>['nativeEvent'],
		...overrides,
	})

	if (!overrides.preventDefault) {
		event.preventDefault = vi.fn(() => {
			event.defaultPrevented = true
		})
	}

	return event
}
