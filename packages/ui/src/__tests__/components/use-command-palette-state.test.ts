import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode, Suspense, use, useLayoutEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useCommandPaletteState } from '../../components/command-palette/use-command-palette-state'
import { deferred, makeKeyEvent } from '../helpers'

const LABELS = ['Alpha', 'Beta', 'Gamma']

function SuspenseBoundary({ children }: { children: ReactNode }) {
	return createElement(Suspense, { fallback: null }, children)
}

/**
 * Renders the open hook over a listbox that it filters on the deferred query,
 * as a consumer does. The render that brings the deferred query to `slowQuery`
 * suspends until the case calls `release`. Thus the deferred query lags the
 * input, as it does while a long list renders.
 */
function renderLaggingPalette(slowQuery: string) {
	const gate = deferred()

	const input = document.createElement('input')

	const list = document.createElement('div')

	const onRun = vi.fn()

	const view = renderHook(
		({ open }: { open: boolean }) => {
			const state = useCommandPaletteState({ open })

			const { deferredQuery } = state

			if (deferredQuery === slowQuery) use(gate.promise)

			useLayoutEffect(() => {
				const rows = LABELS.filter((label) => label.toLowerCase().includes(deferredQuery)).map(
					(label) => {
						const row = document.createElement('div')

						row.id = label

						row.dataset.slot = 'command-palette-item'

						row.addEventListener('click', () => onRun(label))

						return row
					},
				)

				list.replaceChildren(...rows)
			}, [deferredQuery])

			return state
		},
		{ initialProps: { open: true }, wrapper: SuspenseBoundary },
	)

	view.result.current.inputRef.current = input

	act(() => view.result.current.attachList?.(list))

	const press = (key: string) => act(() => view.result.current.onKeyDown(makeKeyEvent(key)))

	// The urgent render commits the query. A deferred render to `slowQuery` waits for the gate.
	const type = (query: string) => act(async () => view.result.current.setQuery(query))

	const release = () => act(async () => gate.resolve())

	return { ...view, onRun, press, type, release }
}

describe('useCommandPaletteState', () => {
	it('starts with an empty query and a stable listbox id', () => {
		const { result } = renderHook(() => useCommandPaletteState({ open: false }))

		expect(result.current.query).toBe('')

		expect(typeof result.current.listboxId).toBe('string')

		expect(result.current.listboxId.length).toBeGreaterThan(0)
	})

	it('resets the query when transitioning from open to closed', () => {
		const { result, rerender } = renderHook(({ open }) => useCommandPaletteState({ open }), {
			initialProps: { open: true },
		})

		act(() => {
			result.current.setQuery('search term')
		})

		expect(result.current.query).toBe('search term')

		rerender({ open: false })

		expect(result.current.query).toBe('')
	})
})

describe('useCommandPaletteState Enter while the deferred query lags', () => {
	it('runs an Enter with no lag at once', () => {
		const { onRun, press } = renderLaggingPalette('b')

		press('ArrowDown')

		press('Enter')

		expect(onRun.mock.calls).toEqual([['Alpha']])
	})

	it('holds the Enter until the results catch up, then runs the new top result', async () => {
		const { onRun, press, type, release } = renderLaggingPalette('b')

		// The highlight sits on Alpha, which the query "b" filters out.
		press('ArrowDown')

		await type('b')

		press('Enter')

		expect(onRun).not.toHaveBeenCalled()

		await release()

		expect(onRun.mock.calls).toEqual([['Beta']])
	})

	it.each(['e', 'Escape'])('drops a held Enter on the next key, %s', async (key) => {
		const { onRun, press, type, release } = renderLaggingPalette('b')

		press('ArrowDown')

		await type('b')

		press('Enter')

		press(key)

		await release()

		expect(onRun).not.toHaveBeenCalled()
	})

	it('drops a held Enter when the palette closes', async () => {
		const { onRun, press, type, release, rerender } = renderLaggingPalette('b')

		press('ArrowDown')

		await type('b')

		press('Enter')

		rerender({ open: false })

		await release()

		expect(onRun).not.toHaveBeenCalled()
	})

	// A paste from the mouse changes the query with no keystroke.
	it('drops a held Enter when the query changes before the results catch up', async () => {
		const { onRun, press, type } = renderLaggingPalette('b')

		press('ArrowDown')

		await type('b')

		press('Enter')

		// The deferred query skips "b" and catches up on "be", whose top result is Beta.
		await type('be')

		expect(onRun).not.toHaveBeenCalled()
	})

	it('drops a held Enter when the caught-up list holds no result', async () => {
		const { onRun, press, type, release } = renderLaggingPalette('z')

		press('ArrowDown')

		await type('z')

		press('Enter')

		await release()

		expect(onRun).not.toHaveBeenCalled()
	})
})
