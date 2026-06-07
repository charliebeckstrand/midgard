import { describe, expect, it } from 'vitest'
import { AspectRatio } from '../../components/aspect-ratio'
import { bySlot, renderUI } from '../helpers'

describe('AspectRatio', () => {
	it('applies numeric ratio as inline style', () => {
		const { container } = renderUI(<AspectRatio ratio={16 / 9}>content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toHaveStyle({ aspectRatio: `${16 / 9}` })
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<AspectRatio id="test">content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toHaveAttribute('id', 'test')
	})
})
