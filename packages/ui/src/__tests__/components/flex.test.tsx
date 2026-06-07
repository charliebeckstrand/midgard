import { describe, expect, it } from 'vitest'
import { Flex } from '../../components/flex'
import { bySlot, renderUI } from '../helpers'

describe('Flex', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Flex id="test">content</Flex>)

		const el = bySlot(container, 'flex')

		expect(el).toHaveAttribute('id', 'test')
	})
})
