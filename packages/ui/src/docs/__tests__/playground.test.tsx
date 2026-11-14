import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getSlot } from '../../__tests__/helpers/slot-queries.ts'
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
	defaultOpen?: boolean
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
			{ name: 'defaultCount', type: 'number', default: '3', defaultValue: 3 },
			{
				name: 'defaultOpen',
				type: 'boolean',
				values: [false, true],
				default: 'false',
				defaultValue: false,
			},
			{ name: 'label', type: 'string', default: "'Thing'", defaultValue: 'Thing' },
			{ name: 'max', type: 'number', default: '100', defaultValue: 100 },
			{
				name: 'orientation',
				type: 'Responsive<Orientation>',
				values: ['horizontal', 'vertical'],
				responsive: true,
				default: 'THING_ORIENTATION',
				defaultValue: { initial: 'vertical', sm: 'horizontal' },
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

	it('gives a start state a field only when `values` or `free` names it', () => {
		const { unmount } = render(<Playground of={ThingPlayground} api={API} />)

		expect(screen.queryByRole('combobox', { name: 'Default open' })).toBeNull()

		unmount()

		render(<Playground of={ThingPlayground} api={API} values={{ defaultOpen: [false, true] }} />)

		fireEvent.click(screen.getByRole('combobox', { name: 'Default open' }))

		fireEvent.click(screen.getByRole('option', { name: 'On' }))

		expect(instanceProps()).toEqual({ defaultOpen: true })
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

		expect(orientation.textContent).toContain('Vertical, Horizontal from medium')

		expect(instanceProps()).toEqual({})

		fireEvent.click(orientation)

		const options = screen.getAllByRole('option')

		expect(options.map((option) => option.textContent)).toEqual([
			'Vertical, Horizontal from mediumDefault',
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

		const panel = await waitFor(() => getSlot(container, 'collapse-panel'))

		await waitFor(() =>
			expect(panel.textContent).toContain('return <Thing label={"Say \\"hi\\""} max={50} />'),
		)
	})

	it('starts a choice field at the value that `start` gives, and shows it once in the code', async () => {
		const { container } = render(
			<Playground of={ThingPlayground} api={API} start={{ orientation: 'horizontal' }} />,
		)

		const orientation = screen.getByRole('combobox', { name: 'Orientation' })

		expect(orientation.textContent).toBe('Horizontal')

		expect(instanceProps()).toEqual({ orientation: 'horizontal' })

		fireEvent.click(screen.getByRole('button', { name: 'Show code' }))

		const panel = await waitFor(() => getSlot(container, 'collapse-panel'))

		await waitFor(() =>
			expect(panel.textContent).toContain('return <Thing orientation="horizontal" />'),
		)

		fireEvent.click(orientation)

		fireEvent.click(screen.getByRole('option', { name: 'Vertical' }))

		expect(instanceProps()).toEqual({ orientation: 'vertical' })

		await waitFor(() =>
			expect(panel.textContent).toContain('return <Thing orientation="vertical" />'),
		)
	})

	it('throws for a start that is not a value of its field', () => {
		expect(() =>
			render(<Playground of={ThingPlayground} api={API} start={{ orientation: 'diagonal' }} />),
		).toThrow('the start of the prop orientation is not a value of its field')
	})

	// A value with no word, such as `16/9`, is code. On a right-to-left page
	// with no `dir`, it shows as `9/16`.
	it('keeps a value with no word left to right, in the field and in its options', () => {
		const api: BarrelApi = {
			Thing: {
				name: 'Thing',
				props: [
					{
						name: 'ratio',
						type: 'string',
						values: ['16/9', '4/3'],
						default: "'16/9'",
						defaultValue: '16/9',
					},
				],
				events: [],
			},
		}

		render(<Playground of={ThingPlayground} api={api} />)

		const field = screen.getByRole('combobox', { name: 'Ratio' })

		fireEvent.click(field)

		const values = [field, ...screen.getAllByRole('option')].map((element) =>
			element.querySelector('[translate="no"]'),
		)

		expect(values.map((value) => value?.textContent)).toEqual(['16/9', '16/9', '4/3'])

		for (const value of values) expect(value?.getAttribute('dir')).toBe('ltr')
	})

	it('hides the field of a prop with a `@media` tag on other devices', () => {
		const api: BarrelApi = {
			Thing: {
				name: 'Thing',
				props: [
					{
						name: 'hover',
						type: 'boolean',
						values: [false, true],
						default: 'false',
						media: 'hover',
					},
					{
						name: 'sheet',
						type: 'boolean',
						values: [false, true],
						default: 'true',
						media: 'phone',
					},
					{ name: 'striped', type: 'boolean', values: [false, true], default: 'false' },
				],
				events: [],
			},
		}

		render(<Playground of={ThingPlayground} api={api} />)

		// jsdom matches no media query, so the test reads the class of each field.
		const field = (name: string) =>
			screen.getByRole('combobox', { name }).closest('[data-slot=listbox]')?.className

		expect(field('Sheet')).toContain('sm:hidden [@media(hover:hover)]:hidden')

		expect(field('Hover')).toContain('[@media(hover:none)]:hidden')

		expect(field('Striped')).not.toContain('hidden')
	})
})
