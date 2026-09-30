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

	it('throws for a name that the barrel does not document', () => {
		expect(() => renderAxes(settled(api), 'Missing')).toThrow(/no documented component "Missing"/)
	})
})
