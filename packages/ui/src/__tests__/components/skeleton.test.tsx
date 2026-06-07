import { describe, expect, it } from 'vitest'
import { Skeleton } from '../../providers/skeleton'
import { bySlot, renderUI } from '../helpers'

describe('Skeleton', () => {
	it('sets aria-busy when loading', () => {
		const { container } = renderUI(<Skeleton>content</Skeleton>)

		const el = bySlot(container, 'skeleton')

		expect(el).toHaveAttribute('aria-busy', 'true')
	})
})
