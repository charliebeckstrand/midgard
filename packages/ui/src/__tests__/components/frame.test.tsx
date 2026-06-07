import { describe, expect, it } from 'vitest'
import { Frame } from '../../components/frame'
import { bySlot, renderUI } from '../helpers'

describe('Frame', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Frame id="test">content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('does not apply default alignment', () => {
		const { container } = renderUI(<Frame>content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el?.className).not.toMatch(/items-/)
	})

	it('does not apply default gap', () => {
		const { container } = renderUI(<Frame>content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el?.className).not.toMatch(/gap-/)
	})
})
