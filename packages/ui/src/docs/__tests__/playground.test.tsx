import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Playground } from '../kit/playground.tsx'
import type { BarrelApi } from '../plugin/api.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'

// The fields of a playground. A prop whose type is a union of literals gets a
// list, a number prop whose default is a number gets a number field, and a
// prop that `free` names gets a text or a number field. A responsive prop gets
// a list of its values, and its default for each breakpoint is the first option.

type ThingProps = {
	label?: string
	max?: number
	defaultCount?: number
	page?: number
	orientation?: 'horizontal' | 'vertical' | { initial?: string; sm?: string }
}

// The source of the playground with no `{...props}`, and the place of the spread.
const SOURCE = 'return <Thing />'

const CODE: ExampleCode = {
	code: SOURCE,
	highlight: {
		html: `<pre class="shiki"><code>${SOURCE}</code></pre>`,
		bg: '#0d1117',
		type: 'dark',
	},
	spread: { index: SOURCE.indexOf(' />'), separator: ' ' },
}

const API: BarrelApi = {
	Thing: {
		name: 'Thing',
		props: [
			{ name: 'defaultCount', type: 'number', default: '3' },
			{ name: 'label', type: 'string', default: "'Thing'" },
			{ name: 'max', type: 'number', default: '100' },
			{
				name: 'orientation',
				type: 'Responsive<Orientation>',
				values: ['horizontal', 'vertical'],
				responsive: true,
				default: 'THING_ORIENTATION',
				defaultByBreakpoint: { initial: 'vertical', sm: 'horizontal' },
			},
			{ name: 'page', type: 'number' },
		],
		events: [],
	},
}

/** The playground module, as the docs plugin gives it: the component and its meta. */
function ThingPlayground(props: ThingProps) {
	return <output data-testid="instance">{JSON.stringify(props)}</output>
}

const meta: ExampleMeta = {
	title: 'Playground',
	id: 'playground',
	component: 'Thing',
	code: () => Promise.resolve(CODE),
}

Object.assign(ThingPlayground, meta)

/** The props that the instance renders with. */
function instanceProps(): ThingProps {
	return JSON.parse(screen.getByTestId('instance').textContent ?? '{}')
}

describe('Playground', () => {
	it('gives a number field to a number prop whose default is a number, and none to a start state', () => {
		render(<Playground of={ThingPlayground} api={API} />)

		const max = screen.getByRole('spinbutton', { name: 'Max' })

		expect(max).toHaveProperty('value', '100')

		expect(screen.queryByRole('spinbutton', { name: 'Default count' })).toBeNull()

		expect(screen.queryByRole('spinbutton', { name: 'Page' })).toBeNull()

		expect(screen.queryByRole('textbox', { name: 'Label' })).toBeNull()

		// The default renders when the prop is omitted, so the instance gets no prop.
		expect(instanceProps()).toEqual({})

		fireEvent.change(max, { target: { value: '50' } })

		expect(instanceProps()).toEqual({ max: 50 })
	})

	it('gives a field to each prop that `free` names, at the value that it gives', () => {
		render(<Playground of={ThingPlayground} api={API} free={{ label: 'Say "hi"', page: 2 }} />)

		expect(screen.getByRole('textbox', { name: 'Label' })).toHaveProperty('value', 'Say "hi"')

		expect(screen.getByRole('spinbutton', { name: 'Page' })).toHaveProperty('value', '2')

		expect(instanceProps()).toEqual({ label: 'Say "hi"', page: 2 })
	})

	it('omits the prop of an empty field, and shows its default as the placeholder', () => {
		render(<Playground of={ThingPlayground} api={API} free={{ label: '' }} />)

		const label = screen.getByRole('textbox', { name: 'Label' })

		expect(label).toHaveProperty('value', '')

		expect(label.getAttribute('placeholder')).toBe('Thing')

		fireEvent.change(label, { target: { value: 'Box' } })

		expect(instanceProps()).toEqual({ label: 'Box' })

		fireEvent.change(label, { target: { value: '' } })

		expect(instanceProps()).toEqual({})
	})

	it('gives a responsive prop its default for each breakpoint as the first option', () => {
		render(<Playground of={ThingPlayground} api={API} />)

		const orientation = screen.getByRole('combobox', { name: 'Orientation' })

		expect(orientation.textContent).toContain('Vertical, Horizontal from sm')

		expect(instanceProps()).toEqual({})

		fireEvent.click(orientation)

		const options = screen.getAllByRole('option')

		expect(options.map((option) => option.textContent)).toEqual([
			'Vertical, Horizontal from smDefault',
			'Horizontal',
			'Vertical',
		])

		fireEvent.click(options[1] as HTMLElement)

		expect(instanceProps()).toEqual({ orientation: 'horizontal' })
	})

	it('shows each value that is not the default as an attribute in the code', async () => {
		const { container } = render(
			<Playground of={ThingPlayground} api={API} free={{ label: 'Say "hi"' }} />,
		)

		fireEvent.change(screen.getByRole('spinbutton', { name: 'Max' }), {
			target: { value: '50' },
		})

		fireEvent.click(screen.getByRole('button', { name: 'Show code' }))

		const panel = await waitFor(() => {
			const el = container.querySelector('[data-slot="collapse-panel"]')

			expect(el).not.toBeNull()

			return el
		})

		await waitFor(() =>
			expect(panel?.textContent).toContain('return <Thing label={"Say \\"hi\\""} max={50} />'),
		)
	})
})
