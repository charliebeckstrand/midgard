import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import { DemoNav, DemoNavProvider, useRegisterExample } from '../../components/demo-nav'
import { fireEvent, renderUI, screen } from '../helpers'

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

const open = () => {
	const button = trigger()

	if (button) fireEvent.click(button)
}

// The menu lists an entry only while it's registered; MenuLabel renders the
// title as text, so a title present in the open menu means its example is listed.
const listed = (title: string) => screen.queryByText(title)

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

describe('DemoNav within Tabs', () => {
	function renderTabbed(defaultValue: string) {
		return renderUI(
			<DemoNavProvider>
				<DemoNav />
				<Tabs defaultValue={defaultValue}>
					<TabList aria-label="Style">
						<Tab value="line">Line</Tab>
						<Tab value="bar">Bar</Tab>
					</TabList>
					<TabContents>
						<TabContent value="line">
							<Probe id="l1" title="Line default" />
							<Probe id="l2" title="Multi-series" />
						</TabContent>
						<TabContent value="bar">
							<Probe id="b1" title="Bar default" />
						</TabContent>
					</TabContents>
				</Tabs>
			</DemoNavProvider>,
		)
	}

	// Fade mode keeps every panel mounted, so without tab-scoping the inactive
	// tab's examples would leak into the list.
	it('lists only the active tab’s examples', () => {
		renderTabbed('bar')

		open()

		expect(listed('Bar default')).toBeInTheDocument()

		expect(listed('Line default')).not.toBeInTheDocument()

		expect(listed('Multi-series')).not.toBeInTheDocument()
	})

	it('swaps the list when the active tab changes', () => {
		renderTabbed('line')

		fireEvent.click(screen.getByRole('tab', { name: 'Bar' }))

		open()

		expect(listed('Bar default')).toBeInTheDocument()

		expect(listed('Line default')).not.toBeInTheDocument()

		expect(listed('Multi-series')).not.toBeInTheDocument()
	})
})
