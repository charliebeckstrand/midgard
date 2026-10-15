// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { triggerChild } from '../../primitives/trigger-child/trigger-child'

describe('triggerChild', () => {
	it('gives a single element child to clone', () => {
		const child = <button type="button">Open</button>

		expect(triggerChild(child)).toBe(child)
	})

	it('gives null for a Fragment child, which has no host element to clone', () => {
		expect(
			triggerChild(
				<>
					Open <span />
				</>,
			),
		).toBeNull()
	})

	it('gives null for text children', () => {
		expect(triggerChild('Open')).toBeNull()
	})
})
