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

describe('Toggle press area', () => {
	// iOS moves a press that misses a clickable node to one near it, and it looks
	// up and to the left first. A press in an empty part of a row thus went to
	// the row above. On a coarse pointer the label covers its row and half of
	// each gap, so the rows of a group leave no empty part.
	it('gives the label the row and half of the gap on a coarse pointer', () => {
		const { container } = renderUI(
			<ToggleGroup>
				<ToggleField>row</ToggleField>
			</ToggleGroup>,
		)

		expect(bySlot(container, 'control')).toHaveClass(
			'density-set-[0.5,1,2,3,4.5]/[--touch-target-gap-y]',
		)

		expect(bySlot(container, 'field')).toHaveClass(
			'relative',
			'isolate',
			'pointer-coarse:*:data-[slot=label]:after:absolute',
			'pointer-coarse:*:data-[slot=label]:after:-z-1',
			'pointer-coarse:*:data-[slot=label]:after:inset-x-0',
			'pointer-coarse:*:data-[slot=label]:after:-inset-y-[calc(var(--touch-target-gap-y,0px)/2)]',
		)
	})
})
