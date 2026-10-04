import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
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

function renderAxes(value: ComponentApi[] | null = api, of = 'Badge') {
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

/** The probes of the playground, the first example, which has no heading. */
function playgroundProbes(): HTMLElement[] {
	const example = document.querySelector('[data-slot="example"]')

	return [...(example?.querySelectorAll<HTMLElement>('[data-slot="probe"]') ?? [])]
}

describe('Axes', () => {
	it('renders nothing without API data', () => {
		const { container } = renderAxes(null)

		expect(container).toBeEmptyDOMElement()
	})

	it('renders an untitled playground and one example for each literal prop', () => {
		renderAxes()

		const titles = screen.getAllByRole('heading').map((heading) => heading.textContent)

		expect(titles).toEqual(['Variant', 'Color'])

		expect(probesOf('Variant').map((probe) => probe.textContent)).toEqual(['Solid', 'Outline'])

		expect(probesOf('Color').map((probe) => probe.textContent)).toEqual(['Red', 'Blue'])
	})

	it('prefixes each title with the title of the Axes', () => {
		renderUI(
			<DemoApiContext value={api}>
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
			<DemoApiContext value={api}>
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
			<DemoApiContext value={api}>
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

		const [playground] = playgroundProbes()

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

		expect(playgroundProbes()[0]).toHaveAttribute('data-variant', 'outline')

		for (const probe of probesOf('Color')) expect(probe).toHaveAttribute('data-variant', 'outline')

		// The Variant example still shows each of its own values.
		expect(probesOf('Variant').map((probe) => probe.getAttribute('data-variant'))).toEqual([
			'solid',
			'outline',
		])
	})

	it('shows each value of a type of density steps', () => {
		const steps: ComponentApi[] = [
			{ name: 'Bar', props: [{ name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'" }] },
		]

		renderUI(
			<DemoApiContext value={steps}>
				<Axes of="Bar" render={() => <div data-slot="probe" className="h-2" />} />
			</DemoApiContext>,
		)

		expect(probesOf('Size')).toHaveLength(5)
	})

	it('shows only the given values of an axis, in the example and in the picker', async () => {
		renderUI(
			<DemoApiContext value={api}>
				<Axes
					of="Badge"
					values={{ color: ['blue'] }}
					render={(props, label) => <Probe {...props}>{label}</Probe>}
				/>
			</DemoApiContext>,
		)

		expect(screen.queryByRole('heading', { name: 'Color' })).toBeNull()

		fireEvent.click(screen.getByRole('combobox', { name: 'Color' }))

		expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
			'Default',
			'Blue',
		])
	})

	it('throws for a name that the barrel does not document', () => {
		expect(() => renderAxes(api, 'Missing')).toThrow(/no documented component "Missing"/)
	})
})
