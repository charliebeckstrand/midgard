import { describe, expect, it } from 'vitest'
import { MapSkeleton } from '../../modules/map'
import { bySlot, renderUI } from '../helpers'

describe('MapSkeleton', () => {
	it('reserves the map frame in an aspect box at the plat fallback ratio', () => {
		const { container } = renderUI(<MapSkeleton />)

		const box = bySlot(container, 'aspect-ratio')

		expect(box).toBeInTheDocument()

		expect(box?.getAttribute('style')).toContain(`aspect-ratio: ${16 / 9}`)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('takes an explicit ratio, and fills the container under ratio={false}', () => {
		const fixed = renderUI(<MapSkeleton ratio="4/3" />)

		expect(bySlot(fixed.container, 'aspect-ratio')?.getAttribute('style')).toContain(
			`aspect-ratio: ${4 / 3}`,
		)

		const fill = renderUI(<MapSkeleton ratio={false} />)

		expect(bySlot(fill.container, 'aspect-ratio')).toBeNull()

		expect(bySlot(fill.container, 'placeholder')).toBeInTheDocument()
	})
})
