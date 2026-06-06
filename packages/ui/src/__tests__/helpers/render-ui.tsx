import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { AnnouncerProvider } from '../../providers/announcer'
import { GlassContext } from '../../providers/glass/context'
import { SkeletonContext } from '../../providers/skeleton'

type UIContextOptions = {
	skeleton?: boolean
	glass?: boolean
	announcer?: boolean
}

type UIRenderOptions = UIContextOptions & Omit<RenderOptions, 'wrapper'>

/**
 * Custom render that wraps the component in commonly needed context providers.
 *
 * Pass `skeleton: true` to simulate skeleton mode and `glass: true` for glass
 * mode — matching how components resolve these flags in production. Pass
 * `announcer: true` to mount `<AnnouncerProvider>` so components that call
 * `useAnnounce` can write to a live region.
 */
export function renderUI(ui: ReactElement, options: UIRenderOptions = {}): RenderResult {
	const { skeleton, glass, announcer, ...renderOptions } = options

	function Wrapper({ children }: { children: ReactNode }) {
		let node = children

		if (skeleton !== undefined) {
			node = <SkeletonContext value={skeleton}>{node}</SkeletonContext>
		}

		if (glass !== undefined) {
			node = <GlassContext value={glass}>{node}</GlassContext>
		}

		if (announcer) {
			node = <AnnouncerProvider>{node}</AnnouncerProvider>
		}

		return <>{node}</>
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions })
}
