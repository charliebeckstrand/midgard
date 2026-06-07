import { describe, expect, it } from 'vitest'
import { Container } from '../../components/container'
import { bySlot, renderUI } from '../helpers'

describe('Container', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Container id="test">content</Container>)

		const el = bySlot(container, 'container')

		expect(el).toHaveAttribute('id', 'test')
	})
})
