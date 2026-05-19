import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { GlassProvider } from '../../components/glass/context'
import { SkeletonProvider } from '../../providers/skeleton'

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
