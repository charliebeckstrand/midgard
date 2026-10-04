import { describe, expect, it } from 'vitest'
import { AspectRatio } from '../../components/aspect-ratio'
import { k } from '../../recipes/kata/aspect-ratio'
import { bySlot, renderUI } from '../helpers'

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
})
