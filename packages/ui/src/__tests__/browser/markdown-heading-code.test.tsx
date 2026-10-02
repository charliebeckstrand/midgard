import { describe, expect, it } from 'vitest'
import { Markdown } from '../../components/markdown'
import { renderUI } from '../helpers'

function fontSize(element: Element | null | undefined) {
	if (!element) throw new Error('expected the element')

	return Number.parseFloat(getComputedStyle(element).fontSize)
}

/**
 * A code span in a Markdown heading. Each code span had the fixed `sm` size, so
 * a code span in a large heading was smaller than the body text.
 */
describe('Markdown: code span in a heading', () => {
	it.each([1, 2, 3])('scales a code span with an h%i', (depth) => {
		const { container } = renderUI(
			<Markdown>{`${'#'.repeat(depth)} Use \`useForm\`\n\nCall \`useForm\` once.`}</Markdown>,
		)

		const heading = container.querySelector(`h${depth}`)

		const headingCode = heading?.querySelector('code')

		const bodyCode = container.querySelector('p code')

		expect(fontSize(headingCode)).toBeGreaterThan(fontSize(bodyCode))

		expect(fontSize(headingCode)).toBeLessThan(fontSize(heading))
	})

	it('keeps the size of a code span in body text', () => {
		const { container } = renderUI(<Markdown>{'Call `useForm` once.'}</Markdown>)

		// The `sm` step of the inline Code recipe is `text-xs`.
		expect(fontSize(container.querySelector('p code'))).toBe(12)
	})
})
