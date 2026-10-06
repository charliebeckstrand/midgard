import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePanelFit } from '../../hooks/use-panel-fit'

/** Renders the fit for a panel whose variant fixes its height, so no observer starts. */
function renderFit(dragged: boolean) {
	return renderHook(
		(props: { dragged: boolean }) =>
			usePanelFit({
				enabled: false,
				dragged: props.dragged,
				ceilingOf: () => 10_000,
				transition: { duration: 0 },
			}),
		{ initialProps: { dragged } },
	)
}

/** A panel with an inline height, as a drag or an interrupted travel leaves it. */
function pinnedPanel(): HTMLDivElement {
	const panel = document.createElement('div')

	panel.style.height = '412px'

	return panel
}

describe('usePanelFit', () => {
	// The drag lets go only when the panel closes. The panel then slides out at the
	// size the reader left it at, so the fit must not take the height off it.
	it('keeps the height of a drag that the close releases', () => {
		const { result, rerender } = renderFit(true)

		const panel = pinnedPanel()

		act(() => result.current(panel))

		rerender({ dragged: false })

		expect(panel.style.height).toBe('412px')
	})

	it('clears an inline height that no drag holds', () => {
		const { result } = renderFit(false)

		const panel = pinnedPanel()

		act(() => result.current(panel))

		expect(panel.style.height).toBe('')
	})
})
