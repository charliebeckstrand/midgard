import { describe, expect, it } from 'vitest'
import { ToggleField, ToggleGroup } from '../../primitives'
import { bySlot, renderUI, screen } from '../helpers'

describe('ToggleGroup', () => {
	it('renders a div with data-slot="control"', () => {
		const { container } = renderUI(<ToggleGroup>items</ToggleGroup>)

		const group = bySlot(container, 'control')

		expect(group).toBeInTheDocument()

		expect(group?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ToggleGroup className="flex">items</ToggleGroup>)

		const group = bySlot(container, 'control')

		expect(group?.className).toContain('flex')
	})

	it('accepts a role attribute', () => {
		const { container } = renderUI(<ToggleGroup role="radiogroup">items</ToggleGroup>)

		const group = bySlot(container, 'control')

		expect(group).toHaveAttribute('role', 'radiogroup')
	})

	it('renders children', () => {
		renderUI(<ToggleGroup>group content</ToggleGroup>)

		expect(screen.getByText('group content')).toBeInTheDocument()
	})
})

describe('ToggleField', () => {
	it('renders a div with data-slot="field"', () => {
		const { container } = renderUI(<ToggleField>label</ToggleField>)

		const field = bySlot(container, 'field')

		expect(field).toBeInTheDocument()

		expect(field?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ToggleField className="gap-2">label</ToggleField>)

		const field = bySlot(container, 'field')

		expect(field?.className).toContain('gap-2')
	})

	it('renders children', () => {
		renderUI(<ToggleField>field content</ToggleField>)

		expect(screen.getByText('field content')).toBeInTheDocument()
	})
})
