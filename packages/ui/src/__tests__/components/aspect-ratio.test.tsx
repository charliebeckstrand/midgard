import { describe, expect, it } from 'vitest'
import { AspectRatio } from '../../components/aspect-ratio'
import { k } from '../../recipes/kata/aspect-ratio'
import { bySlot, getSlot, renderUI } from '../helpers'

describe('AspectRatio', () => {
	it('takes the 1/1 preset by default', () => {
		const { container } = renderUI(<AspectRatio>content</AspectRatio>)

		expect(bySlot(container, 'aspect-ratio')).toHaveClass(k.ratio['1/1'])
	})

	it('gives the square and video aliases the classes of 1/1 and 16/9', () => {
		const { container } = renderUI(
			<>
				<AspectRatio ratio="square">a</AspectRatio>
				<AspectRatio ratio="video">b</AspectRatio>
			</>,
		)

		const [square, video] = container.querySelectorAll('[data-slot="aspect-ratio"]')

		expect(square).toHaveClass(k.ratio['1/1'])

		expect(video).toHaveClass(k.ratio['16/9'])
	})

	it('applies numeric ratio as inline style', () => {
		const { container } = renderUI(<AspectRatio ratio={16 / 9}>content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toHaveStyle({ aspectRatio: `${16 / 9}` })
	})

	it('keeps a numeric ratio against a consumer style, and keeps the rest of that style', () => {
		const { container } = renderUI(
			<AspectRatio ratio={4 / 3} style={{ aspectRatio: '16 / 9', maxWidth: '20rem' }}>
				content
			</AspectRatio>,
		)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toHaveStyle({ aspectRatio: `${4 / 3}`, maxWidth: '20rem' })
	})

	it('keeps a preset ratio against a consumer style ratio, and keeps the rest of that style', () => {
		const { container } = renderUI(
			<AspectRatio ratio="16/9" style={{ aspectRatio: '1', maxWidth: '20rem' }}>
				content
			</AspectRatio>,
		)

		const el = getSlot(container, 'aspect-ratio')

		expect(el).toHaveClass(k.ratio['16/9'])

		expect(el.style.aspectRatio).toBe('')

		expect(el).toHaveStyle({ maxWidth: '20rem' })
	})

	it('keeps the default ratio against a consumer style ratio', () => {
		const { container } = renderUI(
			<AspectRatio style={{ aspectRatio: '16 / 9' }}>content</AspectRatio>,
		)

		const el = getSlot(container, 'aspect-ratio')

		expect(el).toHaveClass(k.ratio['1/1'])

		expect(el.style.aspectRatio).toBe('')
	})

	it.each([
		['zero', 0],
		['negative', -1],
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
	])('falls back to the 1/1 preset for a %s ratio', (_, ratio) => {
		const { container } = renderUI(<AspectRatio ratio={ratio}>content</AspectRatio>)

		const el = getSlot(container, 'aspect-ratio')

		expect(el).toHaveClass(k.ratio['1/1'])

		expect(el.style.aspectRatio).toBe('')
	})
})
