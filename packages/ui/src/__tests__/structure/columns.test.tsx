import { describe, expect, it } from 'vitest'
import { Columns } from '../../structure/columns'
import { bySlot, renderUI } from '../helpers'

describe('Columns', () => {
	it('renders one column with the lg gap by default', () => {
		const { container } = renderUI(<Columns>a</Columns>)

		expect(bySlot(container, 'columns')).toHaveClass(
			'grid',
			'grid-cols-1',
			'density-gap-[2,3,4,5,6]',
		)
	})

	it('gives a class for each breakpoint of columns and gap', () => {
		const { container } = renderUI(
			<Columns columns={{ initial: 1, sm: 2, xl: 4 }} gap={{ initial: 'sm', md: 'lg' }}>
				a
			</Columns>,
		)

		expect(bySlot(container, 'columns')).toHaveClass(
			'grid-cols-1',
			'sm:grid-cols-2',
			'xl:grid-cols-4',
			'density-gap-[0.5,1,2,3,4.5]',
			'md:density-gap-[2,3,4,5,6]',
		)
	})

	it('applies the align class when provided', () => {
		const { container } = renderUI(<Columns align="start">a</Columns>)

		expect(bySlot(container, 'columns')).toHaveClass('items-start')
	})
})
