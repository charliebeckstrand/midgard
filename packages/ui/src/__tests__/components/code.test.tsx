import { describe, expect, it } from 'vitest'
import { Code } from '../../components/code'
import { bySlot, renderUI } from '../helpers'

describe('Code', () => {
	it('renders with data-slot="code"', () => {
		const { container } = renderUI(<Code>const x = 1</Code>)

		const el = bySlot(container, 'code')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('CODE')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Code id="test">x</Code>)

		const el = bySlot(container, 'code')

		expect(el).toHaveAttribute('id', 'test')
	})
})
