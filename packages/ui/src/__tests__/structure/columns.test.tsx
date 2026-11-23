import { describe, expect, it } from 'vitest'
import { Columns, ColumnsItem } from '../../structure/columns'
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
			'density-gap-[1,1.5,2,2.5,3]',
			'md:density-gap-[2,3,4,5,6]',
		)
	})

	it('applies the align class when provided', () => {
		const { container } = renderUI(<Columns align="start">a</Columns>)

		expect(bySlot(container, 'columns')).toHaveClass('items-start')
	})
})

describe('ColumnsItem', () => {
	it('gives no span by default', () => {
		const { container } = renderUI(<ColumnsItem>a</ColumnsItem>)

		expect(bySlot(container, 'columns-item')?.className ?? '').not.toMatch(/col-span/)
	})

	it('spans each column of its row with full', () => {
		const { container } = renderUI(<ColumnsItem span="full">a</ColumnsItem>)

		expect(bySlot(container, 'columns-item')).toHaveClass('col-span-full')
	})

	it('gives a class for each breakpoint of span', () => {
		const { container } = renderUI(
			<ColumnsItem span={{ initial: 1, md: 2, xl: 'full' }}>a</ColumnsItem>,
		)

		expect(bySlot(container, 'columns-item')).toHaveClass(
			'col-span-1',
			'md:col-span-2',
			'xl:col-span-full',
		)
	})

	it('keeps the class and the attributes of the consumer', () => {
		const { container } = renderUI(
			<ColumnsItem span={2} className="pb-2" id="cell">
				a
			</ColumnsItem>,
		)

		const cell = bySlot(container, 'columns-item')

		expect(cell).toHaveClass('col-span-2', 'pb-2')

		expect(cell).toHaveAttribute('id', 'cell')
	})
})
