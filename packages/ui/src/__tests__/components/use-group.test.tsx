import { describe, expect, it } from 'vitest'
import { useGroup } from '../../components/group/use-group'
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

	it.each<[string, number, string[]]>([
		['returns the single child as "only"', 1, ['only']],
		['marks the first as "start" and the last as "end" for two children', 2, ['start', 'end']],
		[
			'fills "middle" for everything between first and last',
			5,
			['start', 'middle', 'middle', 'middle', 'end'],
		],
	])('%s', (_name, count, expected) => {
		const { container } = renderUI(<Harness count={count} />)

		const positions = allBySlot(container, 'child').map((el) => el.getAttribute('data-group'))

		expect(positions).toEqual(expected)
	})

	it('stamps the orientation on every child', () => {
		const { container } = renderUI(<Harness count={3} orientation="vertical" />)

		const children = allBySlot(container, 'child')

		expect(children).toHaveLength(3)

		for (const child of children) {
			expect(child).toHaveAttribute('data-group-orientation', 'vertical')
		}
	})

	it('preserves the original key when present', () => {
		const { container } = renderUI(<Harness count={3} />)

		// React keys aren't visible in the DOM; the data-original-key attribute is
		// the proxy. cloneElement must not strip it.
		const keys = allBySlot(container, 'child').map((el) => el.getAttribute('data-original-key'))

		expect(keys).toEqual(['0', '1', '2'])
	})

	it('flattens children wrapped in Fragments', () => {
		function FragmentHarness() {
			const children = (
				<>
					<button key="a" data-slot="child" type="button">
						a
					</button>
					<button key="b" data-slot="child" type="button">
						b
					</button>
				</>
			)

			return <div>{useGroup(children, 'horizontal')}</div>
		}

		const { container } = renderUI(<FragmentHarness />)

		const positions = allBySlot(container, 'child').map((el) => el.getAttribute('data-group'))

		expect(positions).toEqual(['start', 'end'])
	})
})
