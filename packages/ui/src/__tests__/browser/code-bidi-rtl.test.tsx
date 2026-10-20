import { describe, expect, it } from 'vitest'
import { Code } from '../../components/code'
import { present, renderUI } from '../helpers'

/**
 * Inline code is left-to-right text. In a right-to-left paragraph, the
 * neutral characters at the end of `foo()` take the direction of the
 * paragraph when the code is not isolated, and the call shows as `()foo`.
 */
describe('Code in a right-to-left paragraph (real browser)', () => {
	/** The left edge of the character at `offset` in the text node of `node`. */
	function measureLeft(node: HTMLElement, offset: number): number {
		const text = node.firstChild

		if (!text) throw new Error('expected a text node')

		const range = document.createRange()

		range.setStart(text, offset)

		range.setEnd(text, offset + 1)

		return range.getBoundingClientRect().left
	}

	it('keeps a call in its written order', () => {
		const { container } = renderUI(
			<p dir="rtl">
				שלום <Code>foo()</Code> עולם
			</p>,
		)

		const code = present(container.querySelector<HTMLElement>('[data-slot="code"]'), 'code')

		expect(measureLeft(code, 0)).toBeLessThan(measureLeft(code, 3))
	})
})
