import { type ReactNode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Nav, NavContent, NavContents, NavItem, NavList } from '../../components/nav'
import {
	Stepper,
	StepperPanel,
	StepperPanels,
	StepperStep,
	StepperTitle,
} from '../../components/stepper'
import {
	Tab,
	TabContent,
	TabContents,
	TabList,
	Tabs,
	type TabsOrientation,
} from '../../components/tabs'
import { present, renderUI, screen, waitFor } from '../helpers'

const SHORT = 'Short text.'

const LONG = 'A longer panel text that is much wider than the short one, and wider than the host.'

/**
 * A host that fits its content, as the box of a docs example does. A panel
 * that swaps or opens in place must not set its width. Otherwise the width
 * jumps, and an animated switch wraps the outgoing text at the width of the
 * incoming panel while it exits.
 */
function Fit({ children }: { children: ReactNode }) {
	return (
		<div data-testid="host" style={{ width: 'max-content', minWidth: 240 }}>
			{children}
		</div>
	)
}

/** Two tab panels whose texts differ in width. */
function SectionTabs({ orientation }: { orientation: TabsOrientation }) {
	return (
		<Tabs defaultValue="short" orientation={orientation}>
			<TabList aria-label="Sections">
				<Tab value="short">short</Tab>
				<Tab value="long">long</Tab>
			</TabList>
			<TabContents data-testid="contents">
				<TabContent value="short">{SHORT}</TabContent>
				<TabContent value="long">{LONG}</TabContent>
			</TabContents>
		</Tabs>
	)
}

/** A stepper with a button that moves it to the second step. */
function TwoSteps() {
	const [step, setStep] = useState(0)

	return (
		<>
			<button type="button" onClick={() => setStep(1)}>
				next
			</button>
			<Stepper value={step} onValueChange={setStep}>
				<StepperStep value={0}>
					<StepperTitle>One</StepperTitle>
				</StepperStep>
				<StepperStep value={1}>
					<StepperTitle>Two</StepperTitle>
				</StepperStep>
				<StepperPanels>
					<StepperPanel value={0}>{SHORT}</StepperPanel>
					<StepperPanel value={1}>{LONG}</StepperPanel>
				</StepperPanels>
			</Stepper>
		</>
	)
}

/** Presses the control and waits for the panel to settle. */
async function press(role: 'button' | 'tab', name: string, settled: () => void) {
	screen.getByRole(role, { name }).click()

	await waitFor(settled)
}

describe('panel width in a host that fits its content (real browser)', () => {
	/** The panel that swaps in has settled when it alone is in the contents. */
	const oneTabPanel = () =>
		expect(screen.getByTestId('contents').querySelectorAll(':scope > *')).toHaveLength(1)

	const longVisible = () => expect(screen.getByText(LONG)).toBeVisible()

	it.for<[string, ReactNode, 'button' | 'tab', string, () => void]>([
		[
			'keeps one width across a switch of a horizontal tab group',
			<SectionTabs key="tabs" orientation="horizontal" />,
			'tab',
			'long',
			oneTabPanel,
		],
		[
			'keeps one width across a switch of a vertical tab group',
			<SectionTabs key="tabs" orientation="vertical" />,
			'tab',
			'long',
			oneTabPanel,
		],
		[
			'keeps one width across a switch of nav panels',
			<Nav key="nav" aria-label="Sections" defaultValue="short">
				<NavList>
					<NavItem value="short">short</NavItem>
					<NavItem value="long">long</NavItem>
				</NavList>
				<NavContents data-testid="contents">
					<NavContent value="short">{SHORT}</NavContent>
					<NavContent value="long">{LONG}</NavContent>
				</NavContents>
			</Nav>,
			'button',
			'long',
			() => expect(screen.getByTestId('contents').textContent).toBe(LONG),
		],
		[
			'keeps one width while a collapse opens',
			<Collapse key="collapse" animate={false}>
				<CollapseTrigger>Details</CollapseTrigger>
				<CollapsePanel>{LONG}</CollapsePanel>
			</Collapse>,
			'button',
			'Details',
			longVisible,
		],
		['keeps one width from step to step', <TwoSteps key="steps" />, 'button', 'next', longVisible],
	])('%s', async ([, ui, role, control, settled]) => {
		renderUI(<Fit>{ui}</Fit>)

		const host = screen.getByTestId('host')

		const before = host.getBoundingClientRect().width

		await press(role, control, settled)

		expect(host.getBoundingClientRect().width).toBe(before)
	})

	it('gives the panels of a vertical tab group the width beside the list', () => {
		renderUI(
			<div style={{ width: 600 }}>
				<SectionTabs orientation="vertical" />
			</div>,
		)

		const contents = screen.getByTestId('contents')

		const group = present(contents.closest<HTMLElement>('[data-slot="tab-group"]'), 'tab group')

		const list = present(
			group.querySelector<HTMLElement>('[data-slot="tab-list-scroll"]'),
			'tab list scroller',
		)

		const gap = Number.parseFloat(getComputedStyle(group).columnGap)

		expect(contents.getBoundingClientRect().width).toBeCloseTo(
			group.getBoundingClientRect().width - list.getBoundingClientRect().width - gap,
			0,
		)
	})
})
