import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import type { ComponentApi } from '../../api-reference'
import { Axes, DemoApiContext } from '../../components/axes'
import { fireEvent, renderUI, screen } from '../helpers'

const api: ComponentApi[] = [
	{
		name: 'Badge',
		props: [
			{ name: 'variant', type: "'solid' | 'outline'", default: "'solid'" },
			{ name: 'color', type: "'red' | 'blue'" },
			{ name: 'prefix', type: 'ReactNode' },
		],
	},
]

/** A stand-in for a component, which writes its axis props as data attributes. */
function Probe({
	variant,
	color,
	children,
}: {
	variant?: string
	color?: string
	children: ReactNode
}) {
	return (
		<span data-slot="probe" data-variant={variant} data-color={color}>
			{children}
		</span>
	)
}

/** A fulfilled promise that `use()` reads with no suspend. */
function settled<T>(value: T): Promise<T> {
	return Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
}

function renderAxes(value: Promise<ComponentApi[]> | null = settled(api), of = 'Badge') {
	return renderUI(
		<DemoApiContext value={value}>
			<Axes of={of} render={(props, label) => <Probe {...props}>{label}</Probe>} />
		</DemoApiContext>,
	)
}

/** The probes under the heading of one generated example. */
function probesOf(title: string): HTMLElement[] {
	const example = screen.getByRole('heading', { name: title }).closest('[data-slot="example"]')

	return [...(example?.querySelectorAll<HTMLElement>('[data-slot="probe"]') ?? [])]
}

describe('Axes', () => {
	it('renders nothing without API data', () => {
		const { container } = renderAxes(null)

		expect(container).toBeEmptyDOMElement()
	})

	it('renders a playground and one example for each literal prop', () => {
		renderAxes()

		const titles = screen.getAllByRole('heading').map((heading) => heading.textContent)

		expect(titles).toEqual(['Playground', 'Variant', 'Color'])

		expect(probesOf('Variant').map((probe) => probe.textContent)).toEqual(['Solid', 'Outline'])

		expect(probesOf('Color').map((probe) => probe.textContent)).toEqual(['Red', 'Blue'])
	})

	it('prefixes each title with the title of the Axes', () => {
		renderUI(
			<DemoApiContext value={settled(api)}>
				<Axes
					of="Badge"
					title="Badge group"
					render={(props, label) => <Probe {...props}>{label}</Probe>}
				/>
			</DemoApiContext>,
		)

		const titles = screen.getAllByRole('heading').map((heading) => heading.textContent)

		expect(titles).toEqual(['Badge group', 'Badge group variant', 'Badge group color'])
	})

	it('captions each instance of an axis example, and not the playground', () => {
		renderUI(
			<DemoApiContext value={settled(api)}>
				<Axes of="Badge" render={(props) => <Probe {...props}>badge</Probe>} />
			</DemoApiContext>,
		)

		const captions = [...document.querySelectorAll('[data-slot="axis-caption"]')]

		expect(captions.map((caption) => caption.textContent)).toEqual([
			'Solid',
			'Outline',
			'Red',
			'Blue',
		])
	})

	it('shows no caption with `captions={false}`', () => {
		renderUI(
			<DemoApiContext value={settled(api)}>
				<Axes
					of="Badge"
					captions={false}
					render={(props, label) => <Probe {...props}>{label}</Probe>}
				/>
			</DemoApiContext>,
		)

		expect(document.querySelector('[data-slot="axis-caption"]')).toBeNull()

		expect(probesOf('Variant').map((probe) => probe.textContent)).toEqual(['Solid', 'Outline'])
	})

	it('starts each axis at its default, and leaves an axis with no default unset', () => {
		renderAxes()

		const [playground] = probesOf('Playground')

		expect(playground).toHaveTextContent('Badge')

		expect(playground).not.toHaveAttribute('data-color')

		expect(playground).toHaveAttribute('data-variant', 'solid')

		expect(screen.getByRole('combobox', { name: 'Variant' })).toHaveTextContent(/solid/i)

		expect(screen.getByRole('combobox', { name: 'Color' })).toHaveTextContent(/default/i)
	})

	it('applies a picker value to the playground and to the other axes', async () => {
		renderAxes()

		fireEvent.click(screen.getByRole('combobox', { name: 'Variant' }))

		fireEvent.click(await screen.findByRole('option', { name: /outline/i }))

		expect(probesOf('Playground')[0]).toHaveAttribute('data-variant', 'outline')

		for (const probe of probesOf('Color')) expect(probe).toHaveAttribute('data-variant', 'outline')

		// The Variant example still shows each of its own values.
		expect(probesOf('Variant').map((probe) => probe.getAttribute('data-variant'))).toEqual([
			'solid',
			'outline',
		])
	})

	it('reads settled API data with no suspend, also in a tab panel', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">
						<DemoApiContext value={settled(api)}>
							<Axes of="Badge" render={(props, label) => <Probe {...props}>{label}</Probe>} />
						</DemoApiContext>
					</TabContent>
				</TabContents>
			</Tabs>,
		)

		// React logs the warning of a `use()` in a synchronous `act` from a later task.
		await new Promise((resolve) => setTimeout(resolve, 0))

		const suspended = error.mock.calls.filter(([message]) => String(message).includes('suspended'))

		expect(suspended).toEqual([])

		expect(probesOf('Variant')).toHaveLength(2)

		error.mockRestore()
	})

	it('shows only the sizes that render distinctly, in the example and in the picker', async () => {
		const steps: ComponentApi[] = [
			{ name: 'Bar', props: [{ name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'" }] },
		]

		renderUI(
			<DemoApiContext value={settled(steps)}>
				<Axes
					of="Bar"
					render={(props) => (
						// A stepped class of three values: `xs` renders as `sm`, and `xl` as `lg`.
						<div
							data-slot="probe"
							data-density={(props as { size?: string }).size}
							className="density-h-[2,3,4]"
						/>
					)}
				/>
			</DemoApiContext>,
		)

		const sizes = probesOf('Size').map((probe) => probe.getAttribute('data-density'))

		expect(sizes).toEqual(['sm', 'md', 'lg'])

		fireEvent.click(screen.getByRole('combobox', { name: 'Size' }))

		const options = await screen.findAllByRole('option')

		expect(options.map((option) => option.textContent)).toEqual([
			'Default',
			'Small',
			'Medium',
			'Large',
		])
	})

	it('keeps each size of a component that writes no density scope', () => {
		const steps: ComponentApi[] = [
			{ name: 'Bar', props: [{ name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'" }] },
		]

		renderUI(
			<DemoApiContext value={settled(steps)}>
				<Axes of="Bar" render={() => <div data-slot="probe" className="h-2" />} />
			</DemoApiContext>,
		)

		expect(probesOf('Size')).toHaveLength(5)
	})

	it('hides an axis example that the other axes make inert, and shows it again', async () => {
		// The `outline` variant writes no color, so it makes the color axis inert.
		renderUI(
			<DemoApiContext value={settled(api)}>
				<Axes
					of="Badge"
					render={(props, label) => {
						const { variant, color } = props as { variant?: string; color?: string }

						return (
							<Probe variant={variant} color={variant === 'outline' ? undefined : color}>
								{label}
							</Probe>
						)
					}}
				/>
			</DemoApiContext>,
		)

		expect(probesOf('Color')).toHaveLength(2)

		fireEvent.click(screen.getByRole('combobox', { name: 'Variant' }))

		fireEvent.click(await screen.findByRole('option', { name: /outline/i }))

		expect(screen.queryByRole('heading', { name: 'Color' })).toBeNull()

		// The picker of an inert axis still offers each value.
		fireEvent.click(screen.getByRole('combobox', { name: 'Color' }))

		expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
			'Default',
			'Red',
			'Blue',
		])

		fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

		fireEvent.click(screen.getByRole('combobox', { name: 'Variant' }))

		fireEvent.click(await screen.findByRole('option', { name: /solid/i }))

		expect(probesOf('Color')).toHaveLength(2)
	})

	it('keeps an axis example whose instances render alike at the defaults', () => {
		// A prop whose effect shows only in a later state, such as the panel of a closed dialog.
		renderUI(
			<DemoApiContext value={settled(api)}>
				<Axes
					of="Badge"
					render={(props, label) => (
						<Probe variant={(props as { variant?: string }).variant}>{label}</Probe>
					)}
				/>
			</DemoApiContext>,
		)

		expect(probesOf('Color')).toHaveLength(2)
	})

	it('throws for a name that the barrel does not document', () => {
		expect(() => renderAxes(settled(api), 'Missing')).toThrow(/no documented component "Missing"/)
	})
})
