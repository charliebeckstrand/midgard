import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { GlassContext } from '../../providers/glass/context'

type UIContextOptions = {
	glass?: boolean
}

type UIRenderOptions = UIContextOptions & Omit<RenderOptions, 'wrapper'>

/**
 * Custom render that wraps the component in the glass context provider.
 *
 * Pass `glass: true` to simulate glass mode. The announcer's live region is
 * created on demand by `announce` / `useA11yAnnouncements` and requires no
 * setup here.
 */
export function renderUI(ui: ReactElement, options: UIRenderOptions = {}): RenderResult {
	const { glass, ...renderOptions } = options

	function Wrapper({ children }: { children: ReactNode }) {
		let node = children

		if (glass !== undefined) {
			node = <GlassContext value={glass}>{node}</GlassContext>
		}

		return <>{node}</>
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions })
}
