import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useA11yHasTabbable } from '../../hooks/a11y/use-a11y-has-tabbable'

function mountPanel(html: string) {
	const el = document.createElement('div')

	el.innerHTML = html

	document.body.append(el)

	return el
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('useA11yHasTabbable', () => {
	it('reports a tabbable descendant', () => {
		const panel = mountPanel('<button type="button">Undo</button>')

		const { result } = renderHook(() => useA11yHasTabbable(panel))

		expect(result.current).toBe(true)
	})

	it('reports prose-only content as untabbable', () => {
		const panel = mountPanel('<span>Saved 3 minutes ago</span>')

		const { result } = renderHook(() => useA11yHasTabbable(panel))

		expect(result.current).toBe(false)
	})

	it('skips a disabled control and a negative tabindex', () => {
		const panel = mountPanel(
			'<button type="button" disabled>Undo</button><span tabindex="-1">Detail</span>',
		)

		const { result } = renderHook(() => useA11yHasTabbable(panel))

		// Neither is in the tab order, so neither makes the subtree reachable.
		expect(result.current).toBe(false)
	})

	it('scans descendants only, not the node itself', () => {
		const panel = mountPanel('<span>Saved</span>')

		panel.setAttribute('tabindex', '0')

		const { result } = renderHook(() => useA11yHasTabbable(panel))

		expect(result.current).toBe(false)
	})

	it('re-measures when a control is added to the subtree', async () => {
		const panel = mountPanel('<span>Loading…</span>')

		const { result } = renderHook(() => useA11yHasTabbable(panel))

		expect(result.current).toBe(false)

		const button = document.createElement('button')

		panel.append(button)

		await waitFor(() => expect(result.current).toBe(true))
	})

	it('re-measures when the only control becomes disabled', async () => {
		const panel = mountPanel('<button type="button">Undo</button>')

		const { result } = renderHook(() => useA11yHasTabbable(panel))

		expect(result.current).toBe(true)

		panel.querySelector('button')?.setAttribute('disabled', '')

		await waitFor(() => expect(result.current).toBe(false))
	})

	it('re-measures against the node it is handed', () => {
		const withButton = mountPanel('<button type="button">Undo</button>')

		const withoutButton = mountPanel('<span>Saved</span>')

		const { result, rerender } = renderHook(({ node }) => useA11yHasTabbable(node), {
			initialProps: { node: withButton as HTMLElement | null },
		})

		expect(result.current).toBe(true)

		// The measured node is a parameter, not a ref read once: swapping it
		// re-runs the probe, which is what lets a portalled surface report the
		// panel it mounts a commit later.
		rerender({ node: withoutButton })

		expect(result.current).toBe(false)
	})

	it('reports false for a detached surface', () => {
		const { result } = renderHook(() => useA11yHasTabbable(null))

		expect(result.current).toBe(false)
	})
})
