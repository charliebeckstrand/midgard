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
	it.each<TabsOrientation>(['horizontal', 'vertical'])(
		'keeps one width across a switch of a %s tab group',
		async (orientation) => {
			renderUI(
				<Fit>
					<SectionTabs orientation={orientation} />
				</Fit>,
			)

			const host = screen.getByTestId('host')

			const before = host.getBoundingClientRect().width

			const contents = screen.getByTestId('contents')

			await press('tab', 'long', () =>
				expect(contents.querySelectorAll(':scope > *')).toHaveLength(1),
			)

			expect(host.getBoundingClientRect().width).toBe(before)
		},
	)

	it('keeps one width across a switch of nav panels', async () => {
		renderUI(
			<Fit>
				<Nav aria-label="Sections" defaultValue="short">
					<NavList>
						<NavItem value="short">short</NavItem>
						<NavItem value="long">long</NavItem>
					</NavList>
					<NavContents data-testid="contents">
						<NavContent value="short">{SHORT}</NavContent>
						<NavContent value="long">{LONG}</NavContent>
					</NavContents>
				</Nav>
			</Fit>,
		)

		const host = screen.getByTestId('host')

		const before = host.getBoundingClientRect().width

		const contents = screen.getByTestId('contents')

		await press('button', 'long', () => expect(contents.textContent).toBe(LONG))

		expect(host.getBoundingClientRect().width).toBe(before)
	})

	it('keeps one width while a collapse opens', async () => {
		renderUI(
			<Fit>
				<Collapse animate={false}>
					<CollapseTrigger>Details</CollapseTrigger>
					<CollapsePanel>{LONG}</CollapsePanel>
				</Collapse>
			</Fit>,
		)

		const host = screen.getByTestId('host')

		const before = host.getBoundingClientRect().width

		await press('button', 'Details', () => expect(screen.getByText(LONG)).toBeVisible())

		expect(host.getBoundingClientRect().width).toBe(before)
	})

	it('keeps one width from step to step', async () => {
		renderUI(
			<Fit>
				<TwoSteps />
			</Fit>,
		)

		const host = screen.getByTestId('host')

		const before = host.getBoundingClientRect().width

		await press('button', 'next', () => expect(screen.getByText(LONG)).toBeVisible())

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
