import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { GlassContext } from '../../providers/glass/context'
import { SkeletonContext } from '../../providers/skeleton'

type UIContextOptions = {
	skeleton?: boolean
	glass?: boolean
}

type UIRenderOptions = UIContextOptions & Omit<RenderOptions, 'wrapper'>

/**
 * Custom render that wraps the component in skeleton/glass context providers.
 *
 * Pass `skeleton: true` to simulate skeleton mode and `glass: true` for glass
 * mode. The announcer's live region is created on demand by `announce` /
 * `useA11yAnnouncements` and requires no setup here.
 */
export function renderUI(ui: ReactElement, options: UIRenderOptions = {}): RenderResult {
	const { skeleton, glass, ...renderOptions } = options

	function Wrapper({ children }: { children: ReactNode }) {
		let node = children

		if (skeleton !== undefined) {
			node = <SkeletonContext value={skeleton}>{node}</SkeletonContext>
		}

		if (glass !== undefined) {
			node = <GlassContext value={glass}>{node}</GlassContext>
		}

		return <>{node}</>
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions })
}
