import { describe, expect, it } from 'vitest'
import { AspectRatio } from '../../components/aspect-ratio'
import { bySlot, renderUI } from '../helpers'

describe('AspectRatio', () => {
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
