import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { DemoNav, DemoNavProvider, useRegisterExample } from '../../components/demo-nav'
import { renderUI, screen } from '../helpers'

// A stand-in for Example: registers itself and anchors a scroll target, without
// pulling in the full Example surface (code derivation, Shiki, Collapse).
function Probe({ id, title }: { id: string; title?: ReactNode }) {
	useRegisterExample(id, title)

	return <div id={id} data-slot="example" />
}

function renderWith(probes: { id: string; title?: ReactNode }[]) {
	return renderUI(
		<DemoNavProvider>
			<DemoNav />
			{probes.map((probe) => (
				<Probe key={probe.id} id={probe.id} title={probe.title} />
			))}
		</DemoNavProvider>,
	)
}

const trigger = () => screen.queryByRole('button', { name: 'Jump to example' })

describe('DemoNav', () => {
	it('stays hidden below three registered examples', () => {
		renderWith([
			{ id: 'a', title: 'One' },
			{ id: 'b', title: 'Two' },
		])

		expect(trigger()).toBeNull()
	})

	it('appears once three examples register', () => {
		renderWith([
			{ id: 'a', title: 'One' },
			{ id: 'b', title: 'Two' },
			{ id: 'c', title: 'Three' },
		])

		expect(trigger()).not.toBeNull()
	})

	it('counts only titled examples toward the threshold', () => {
		renderWith([{ id: 'a', title: 'One' }, { id: 'b', title: 'Two' }, { id: 'c' }])

		expect(trigger()).toBeNull()
	})

	it('hides again when examples unmount below the threshold', () => {
		const { rerender } = renderUI(
			<DemoNavProvider>
				<DemoNav />
				<Probe id="a" title="One" />
				<Probe id="b" title="Two" />
				<Probe id="c" title="Three" />
			</DemoNavProvider>,
		)

		expect(trigger()).not.toBeNull()

		rerender(
			<DemoNavProvider>
				<DemoNav />
				<Probe id="a" title="One" />
				<Probe id="b" title="Two" />
			</DemoNavProvider>,
		)

		expect(trigger()).toBeNull()
	})
})
