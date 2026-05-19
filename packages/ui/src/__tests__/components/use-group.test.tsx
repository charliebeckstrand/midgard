import { describe, expect, it } from 'vitest'
import { useGroup } from '../../components/group'
import { allBySlot, renderUI } from '../helpers'

describe('useGroup', () => {
	function Harness({
		count,
		orientation = 'horizontal',
	}: {
		count: number
		orientation?: 'horizontal' | 'vertical'
	}) {
		const children = Array.from({ length: count }, (_, i) => (
			<button
				key={`${i.toString()}-original`}
				data-slot="child"
				data-original-key={i}
				type="button"
			>
				{i.toString()}
			</button>
		))

		return <div>{useGroup(children, orientation)}</div>
	}

	it('returns the single child as "only"', () => {
		const { container } = renderUI(<Harness count={1} />)

		const [child] = allBySlot(container, 'child')

		expect(child).toHaveAttribute('data-group', 'only')
	})

	it('marks the first as "start" and the last as "end" for two children', () => {
		const { container } = renderUI(<Harness count={2} />)

		const positions = allBySlot(container, 'child').map((el) => el.getAttribute('data-group'))

		expect(positions).toEqual(['start', 'end'])
	})

	it('fills "middle" for everything between first and last', () => {
		const { container } = renderUI(<Harness count={5} />)

		const positions = allBySlot(container, 'child').map((el) => el.getAttribute('data-group'))

		expect(positions).toEqual(['start', 'middle', 'middle', 'middle', 'end'])
	})

	it('stamps the orientation on every child', () => {
		const { container } = renderUI(<Harness count={3} orientation="vertical" />)

		for (const child of allBySlot(container, 'child')) {
			expect(child).toHaveAttribute('data-group-orientation', 'vertical')
		}
	})

	it('preserves the original key when present', () => {
		const { container } = renderUI(<Harness count={3} />)

		// React keys aren't visible in the DOM; the data-original-key attribute is
		// our proxy. cloneElement should not strip it.
		const keys = allBySlot(container, 'child').map((el) => el.getAttribute('data-original-key'))

		expect(keys).toEqual(['0', '1', '2'])
	})
})
