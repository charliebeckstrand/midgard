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
	it('stays hidden until an example registers', () => {
		renderWith([])

		expect(trigger()).toBeNull()
	})

	it('appears once an example registers', () => {
		renderWith([{ id: 'a', title: 'One' }])

		expect(trigger()).not.toBeNull()
	})

	it('counts only titled examples toward the threshold', () => {
		renderWith([{ id: 'a' }])

		expect(trigger()).toBeNull()
	})

	it('hides again when its last example unmounts', () => {
		const { rerender } = renderUI(
			<DemoNavProvider>
				<DemoNav />
				<Probe id="a" title="One" />
			</DemoNavProvider>,
		)

		expect(trigger()).not.toBeNull()

		rerender(
			<DemoNavProvider>
				<DemoNav />
			</DemoNavProvider>,
		)

		expect(trigger()).toBeNull()
	})
})
