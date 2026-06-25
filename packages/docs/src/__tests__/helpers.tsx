import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { GlassContext } from 'ui/providers/glass'

export { screen } from '@testing-library/react'

type UIRenderOptions = { glass?: boolean } & Omit<RenderOptions, 'wrapper'>

/**
 * Render a chrome component for assertion, optionally inside the glass context
 * the surface tier reads. Mirrors ui's test renderer so chrome tests query by
 * `data-slot` the same way component tests do.
 */
export function renderUI(ui: ReactElement, options: UIRenderOptions = {}): RenderResult {
	const { glass, ...renderOptions } = options

	function Wrapper({ children }: { children: ReactNode }) {
		return glass !== undefined ? <GlassContext value={glass}>{children}</GlassContext> : children
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/** Query a single element by its `data-slot` attribute, mirroring `querySelector`. */
export function bySlot(container: HTMLElement, name: string) {
	return container.querySelector<HTMLElement>(`[data-slot="${name}"]`)
}

/** Query all elements matching a `data-slot` attribute. */
export function allBySlot(container: HTMLElement, name: string) {
	return Array.from(container.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`))
}
