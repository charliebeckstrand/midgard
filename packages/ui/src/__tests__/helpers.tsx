import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { GlassProvider } from '../components/glass/context'
import { AffixSizeProvider } from '../components/input/context'
import { SkeletonProvider } from '../components/skeleton/context'

// ── Context wrapper options ─────────────────────────

type UIContextOptions = {
	skeleton?: boolean
	glass?: boolean
	affixSize?: 'xs' | 'sm' | 'md' | 'lg'
}

type UIRenderOptions = UIContextOptions & Omit<RenderOptions, 'wrapper'>

/**
 * Custom render that wraps the component in commonly needed context providers.
 *
 * Pass `skeleton: true` to simulate skeleton mode, `glass: true` for glass
 * mode, and `affixSize` to inject the size `<Input>` broadcasts to its affix
 * descendants — matching how components resolve these values in production.
 */
export function renderUI(ui: ReactElement, options: UIRenderOptions = {}): RenderResult {
	const { skeleton, glass, affixSize, ...renderOptions } = options

	function Wrapper({ children }: { children: ReactNode }) {
		let node = children

		if (skeleton !== undefined) {
			node = <SkeletonProvider value={skeleton}>{node}</SkeletonProvider>
		}

		if (glass !== undefined) {
			node = <GlassProvider value={glass}>{node}</GlassProvider>
		}

		if (affixSize !== undefined) {
			node = <AffixSizeProvider value={affixSize}>{node}</AffixSizeProvider>
		}

		return <>{node}</>
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// ── Query helpers ───────────────────────────────────

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

// ── Re-exports ──────────────────────────────────────

export { act, fireEvent, screen, waitFor, within } from '@testing-library/react'

export { default as userEvent } from '@testing-library/user-event'
