import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'
import { GlassProvider } from '../components/glass/context'
import { SkeletonProvider } from '../providers/skeleton'

type UIContextOptions = {
	skeleton?: boolean
	glass?: boolean
}

type UIRenderOptions = UIContextOptions & Omit<RenderOptions, 'wrapper'>

/**
 * Custom render that wraps the component in commonly needed context providers.
 *
 * Pass `skeleton: true` to simulate skeleton mode and `glass: true` for glass
 * mode — matching how components resolve these flags in production.
 */
export function renderUI(ui: ReactElement, options: UIRenderOptions = {}): RenderResult {
	const { skeleton, glass, ...renderOptions } = options

	function Wrapper({ children }: { children: ReactNode }) {
		let node = children

		if (skeleton !== undefined) {
			node = <SkeletonProvider value={skeleton}>{node}</SkeletonProvider>
		}

		if (glass !== undefined) {
			node = <GlassProvider value={glass}>{node}</GlassProvider>
		}

		return <>{node}</>
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Query a single element by its `data-slot` attribute within a container.
 * Returns `null` when not found — mirrors `querySelector` semantics.
 */
export function bySlot(container: HTMLElement, name: string) {
	return container.querySelector<HTMLElement>(`[data-slot="${name}"]`)
}

/**
 * Query all elements matching a `data-slot` attribute within a container.
 */
export function allBySlot(container: HTMLElement, name: string) {
	return Array.from(container.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`))
}

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

export { act, fireEvent, screen, waitFor, within } from '@testing-library/react'

export { default as userEvent } from '@testing-library/user-event'
