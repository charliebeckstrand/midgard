import { describe, expect, it } from 'vitest'
import { ToggleField, ToggleGroup } from '../../primitives/toggle'
import { bySlot, renderUI } from '../helpers'

describe('ToggleGroup', () => {
	it('renders a div with data-slot="control"', () => {
		const { container } = renderUI(<ToggleGroup>items</ToggleGroup>)

		const group = bySlot(container, 'control')

		expect(group).toBeInTheDocument()

		expect(group?.tagName).toBe('DIV')
	})

	it('accepts a role attribute', () => {
		const { container } = renderUI(<ToggleGroup role="radiogroup">items</ToggleGroup>)

		const group = bySlot(container, 'control')

		expect(group).toHaveAttribute('role', 'radiogroup')
	})
})

describe('ToggleField', () => {
	it('renders a div with data-slot="field"', () => {
		const { container } = renderUI(<ToggleField>label</ToggleField>)

		const field = bySlot(container, 'field')

		expect(field).toBeInTheDocument()

		expect(field?.tagName).toBe('DIV')
	})
})
