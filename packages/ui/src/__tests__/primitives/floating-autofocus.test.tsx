import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useA11yAutoFocus } from '../../hooks'
import { PopoverPanel } from '../../primitives/popover'
import { attach, renderUI } from '../helpers'

/**
 * A floating panel takes focus on open without a scroll of the page.
 *
 * The panel mounts at the origin of its wrapper, and Floating UI places it a
 * microtask later. A focus that scrolls then takes a scrolled page to the top
 * each time a Select or a context menu opens. Each autofocus path of the family
 * is a case here.
 */
describe('floating autofocus', () => {
	it.each<[string, () => void]>([
		[
			'a PopoverPanel with a selected item',
			() => {
				renderUI(
					<PopoverPanel>
						<div role="option" tabIndex={-1} aria-selected data-selected="">
							One
						</div>
					</PopoverPanel>,
				)
			},
		],
		[
			'a PopoverPanel with nothing selected',
			() => {
				renderUI(<PopoverPanel>options</PopoverPanel>)
			},
		],
		[
			'useA11yAutoFocus, which PopoverContent uses',
			() => {
				const node = document.createElement('div')

				node.tabIndex = -1

				attach(node)

				renderHook(() => useA11yAutoFocus(node, true))
			},
		],
	])('focuses %s without a scroll of the page', (_name, open) => {
		const focus = vi.spyOn(HTMLElement.prototype, 'focus')

		open()

		expect(focus).toHaveBeenCalled()

		for (const [options] of focus.mock.calls) expect(options).toEqual({ preventScroll: true })
	})
})
