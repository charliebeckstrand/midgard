import type { ComponentProps, ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Description, Field, Label, Message } from '../../components/fieldset'
import { RangeSlider, Slider } from '../../components/slider'
import { snapValue } from '../../components/slider/range/range-utilities'
import { Form } from '../../modules/form'
import { LocaleProvider } from '../../providers/locale'
import {
	allBySlot,
	bySlot,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	setupUser,
	userEvent,
} from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('Slider', () => {
	it('renders as a range input with data-slot="slider"', () => {
		const { container } = renderUI(<Slider />)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		expect(el).toBeInTheDocument()

		expect(el.type).toBe('range')
	})

	it('passes through min, max, and step', () => {
		const { container } = renderUI(<Slider min={0} max={50} step={5} />)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		expect(el.min).toBe('0')

		expect(el.max).toBe('50')

		expect(el.step).toBe('5')
	})

	it('announces the value via getValueText', () => {
		const { container } = renderUI(
			<Slider defaultValue={3} max={5} getValueText={(v) => `${v} of 5 stars`} />,
		)

		expect(bySlot(container, 'slider')).toHaveAttribute('aria-valuetext', '3 of 5 stars')
	})

	it('fires onValueChange on input', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<Slider defaultValue={20} onValueChange={onValueChange} />)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		fireEvent.change(el, { target: { value: '50' } })

		expect(onValueChange).toHaveBeenCalledWith(50)
	})

	it('reflects a controlled value', () => {
		const { container } = renderUI(<Slider value={42} onValueChange={() => {}} />)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		expect(el.value).toBe('42')
	})

	// The native input snaps the value to the step grid in [min, max]. The fill and the
	// value text must show the value of the thumb, and not the raw prop.
	it.each([
		{ value: 33, step: 10, max: 100, shown: 30 },
		{ value: 150, step: 1, max: 100, shown: 100 },
		{ value: -5, step: 1, max: 100, shown: 0 },
		{ value: 10, step: 3, max: 10, shown: 9 },
		{ value: 0.3, step: 0.1, max: 0.3, shown: 0.3 },
		{ value: 42.4, step: 0, max: 100, shown: 42 },
	])('shows the value $value at the native value $shown', ({ value, step, max, shown }) => {
		const { container } = renderUI(
			<Slider
				value={value}
				step={step}
				max={max}
				onValueChange={() => {}}
				getValueText={(v) => `${v} units`}
			/>,
		)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		expect(el).toHaveAttribute('aria-valuetext', `${shown} units`)

		expect(el.style.getPropertyValue('--slider-value')).toBe(`${(shown / max) * 100}%`)
	})

	// A native range input ignores `readonly`, so the Slider keeps the value itself.
	it('keeps the value of a read-only slider and marks it aria-readonly', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Slider readOnly defaultValue={20} onValueChange={onValueChange} />,
		)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		fireEvent.change(el, { target: { value: '50' } })

		el.focus()

		await user.keyboard('{ArrowRight}')

		expect(onValueChange).not.toHaveBeenCalled()

		expect(el.value).toBe('20')

		expect(el).toHaveAttribute('aria-readonly', 'true')

		expect(el).not.toHaveAttribute('readonly')
	})

	it('takes the read-only state of an enclosing Control', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Control readOnly>
				<Slider defaultValue={20} onValueChange={onValueChange} />
			</Control>,
		)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		fireEvent.change(el, { target: { value: '50' } })

		expect(onValueChange).not.toHaveBeenCalled()

		expect(el.value).toBe('20')

		expect(el).toHaveAttribute('aria-readonly', 'true')
	})

	it('keeps an explicit readOnly={false} over a read-only Control', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Control readOnly>
				<Slider readOnly={false} defaultValue={20} onValueChange={onValueChange} />
			</Control>,
		)

		fireEvent.change(getSlot<HTMLInputElement>(container, 'slider'), { target: { value: '50' } })

		expect(onValueChange).toHaveBeenCalledWith(50)
	})

	it('merges caller-supplied inline style with the slider --slider-value var', () => {
		const { container } = renderUI(<Slider defaultValue={25} style={{ width: '300px' }} />)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		expect(el.style.width).toBe('300px')

		expect(el.style.getPropertyValue('--slider-value')).toBe('25%')
	})
})

describe('RangeSlider', () => {
	it('renders two thumbs with slider roles', () => {
		const { container } = renderUI(<RangeSlider />)

		expect(allBySlot(container, 'slider-range-thumb')).toHaveLength(2)
	})

	// The thumbs, the fill, and the ARIA values show the range in [min, max], in order.
	it.each([
		{ value: [-10, 150], shown: [0, 100] },
		{ value: [80, 20], shown: [20, 80] },
		{ value: [120, -5], shown: [0, 100] },
	] as const)('shows the range $value as $shown', ({ value, shown }) => {
		const { container } = renderUI(
			<RangeSlider
				value={[value[0], value[1]]}
				onValueChange={() => {}}
				getValueText={(v) => `${v} units`}
			/>,
		)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAttribute('aria-valuenow', String(shown[0]))
		expect(lo).toHaveAttribute('aria-valuemax', String(shown[1]))
		expect(lo).toHaveAttribute('aria-valuetext', `${shown[0]} units`)
		expect(lo?.style.insetInlineStart).toBe(`${shown[0]}%`)

		expect(hi).toHaveAttribute('aria-valuenow', String(shown[1]))
		expect(hi).toHaveAttribute('aria-valuemin', String(shown[0]))
		expect(hi?.style.insetInlineStart).toBe(`${shown[1]}%`)

		const fill = getSlot(container, 'slider-range-fill')

		expect(fill.style.insetInlineStart).toBe(`${shown[0]}%`)
		expect(fill.style.insetInlineEnd).toBe(`${100 - shown[1]}%`)
	})

	it('steps the value that a thumb shows from a range out of order', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[80, 20]} onValueChange={onValueChange} />,
		)

		allBySlot(container, 'slider-range-thumb')[0]?.focus()

		await user.keyboard('{ArrowRight}')

		expect(onValueChange).toHaveBeenLastCalledWith([21, 80])
	})

	it('puts the field id on the start thumb, so the Field Label targets a labelable element', () => {
		const { container, getByText } = renderUI(
			<Field>
				<Label>Price</Label>
				<RangeSlider />
			</Field>,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		const label = getByText('Price') as HTMLLabelElement

		// A `<div>` is not labelable, so a label for the root is an HTML conformance error.
		expect(getSlot(container, 'slider-range')).not.toHaveAttribute('id')

		expect(label.htmlFor).not.toBe('')

		expect(label.control).toBe(lo)
	})

	it.each<[string, () => ReactElement, string, string, string]>([
		[
			'sets aria-valuenow on each thumb to reflect the default value',
			() => <RangeSlider defaultValue={[25, 75]} />,
			'aria-valuenow',
			'25',
			'75',
		],
		[
			'names the thumbs generically by default',
			() => <RangeSlider />,
			'aria-label',
			'Range start',
			'Range end',
		],
		[
			'announces thumb values via getValueText',
			() => (
				<RangeSlider
					defaultValue={[25, 75]}
					getValueText={(v, i) => `${i === 0 ? 'from' : 'to'} $${v}`}
				/>
			),
			'aria-valuetext',
			'from $25',
			'to $75',
		],
	])('%s', (_name, ui, attribute, lo, hi) => {
		const { container } = renderUI(ui())

		const [loThumb, hiThumb] = allBySlot(container, 'slider-range-thumb')

		expect(loThumb).toHaveAttribute(attribute, lo)

		expect(hiThumb).toHaveAttribute(attribute, hi)
	})

	// Each row drives one key on one thumb (0 = low, 1 = high) and asserts the
	// resulting onValueChange payload. min=2 max=10 step=3 + End covers the
	// clamp-after-snap branch: a thumb must never exceed aria-valuemax.
	it.each<[string, ComponentProps<typeof RangeSlider>, number, string, number[]]>([
		[
			'never lands past max when snapping rounds upward (clamp after snap)',
			{ min: 2, max: 10, step: 3, defaultValue: [2, 8] },
			1,
			'End',
			[2, 10],
		],
		[
			'takes a large step on Page keys (APG slider pattern)',
			{ defaultValue: [10, 90], step: 1 },
			0,
			'PageUp',
			[20, 90],
		],
		[
			'moves the low thumb right when ArrowRight is pressed',
			{ defaultValue: [10, 90], step: 5 },
			0,
			'ArrowRight',
			[15, 90],
		],
		[
			'moves the high thumb left when ArrowLeft is pressed',
			{ defaultValue: [10, 90], step: 5 },
			1,
			'ArrowLeft',
			[10, 85],
		],
		[
			'snaps the low thumb to min when Home is pressed',
			{ defaultValue: [40, 90], min: 0, max: 100 },
			0,
			'Home',
			[0, 90],
		],
		[
			'snaps the high thumb to max when End is pressed',
			{ defaultValue: [10, 60], min: 0, max: 100 },
			1,
			'End',
			[10, 100],
		],
		[
			'prevents the low thumb from crossing the high thumb when allowCross is false',
			{ defaultValue: [48, 50], step: 5, allowCross: false },
			0,
			'ArrowRight',
			[50, 50],
		],
	])('%s', (_name, props, thumb, key, expected) => {
		const onChange = vi.fn()

		const { container } = renderUI(<RangeSlider {...props} onValueChange={onChange} />)

		const thumbs = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(thumbs[thumb] as HTMLElement, { key })

		expect(onChange).toHaveBeenCalledWith(expected)
	})

	// A chord such as Alt+ArrowLeft (history back) is for the browser. A key
	// that the slider does not use also stays with the browser.
	it.each([
		['an unrelated key', 'a', {}],
		['Alt+ArrowLeft', 'ArrowLeft', { altKey: true }],
		['Ctrl+Home', 'Home', { ctrlKey: true }],
		['Cmd+ArrowRight', 'ArrowRight', { metaKey: true }],
	])('ignores %s and keeps its default', (_name, key, modifier) => {
		const onChange = vi.fn()

		const { container } = renderUI(<RangeSlider defaultValue={[10, 90]} onValueChange={onChange} />)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		const proceeded = fireEvent.keyDown(lo as HTMLElement, { key, ...modifier })

		expect(proceeded).toBe(true)

		expect(onChange).not.toHaveBeenCalled()
	})

	it('swaps thumbs and shifts focus when the low thumb crosses the high thumb', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[50, 50]} step={5} onValueChange={onChange} />,
		)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		;(lo as HTMLElement).focus()

		fireEvent.keyDown(lo as HTMLElement, { key: 'ArrowRight' })

		expect(onChange).toHaveBeenCalledWith([50, 55])

		expect(document.activeElement).toBe(hi)
	})

	it('disables thumbs when disabled', () => {
		const { container } = renderUI(<RangeSlider disabled />)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toBeDisabled()

		expect(hi).toBeDisabled()
	})

	it('keeps both values of a read-only slider on a key and marks each thumb aria-readonly', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider readOnly defaultValue={[20, 80]} onValueChange={onValueChange} />,
		)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		lo?.focus()

		await user.keyboard('{ArrowRight}{End}{PageUp}')

		expect(onValueChange).not.toHaveBeenCalled()

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '80')

		for (const thumb of [lo, hi]) {
			expect(thumb).toHaveAttribute('aria-readonly', 'true')

			expect(thumb).not.toBeDisabled()

			expect(thumb).toHaveAttribute('tabindex', '0')
		}

		expect(lo).toHaveFocus()
	})

	it('takes the read-only state of an enclosing Control', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Control readOnly>
				<RangeSlider defaultValue={[20, 80]} onValueChange={onValueChange} />
			</Control>,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		lo?.focus()

		await user.keyboard('{ArrowRight}')

		expect(onValueChange).not.toHaveBeenCalled()

		expect(lo).toHaveAttribute('aria-readonly', 'true')
	})

	it('keeps an explicit readOnly={false} over a read-only Control', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Control readOnly>
				<RangeSlider readOnly={false} defaultValue={[20, 80]} onValueChange={onValueChange} />
			</Control>,
		)

		allBySlot(container, 'slider-range-thumb')[0]?.focus()

		await user.keyboard('{ArrowRight}')

		expect(onValueChange).toHaveBeenCalledWith([21, 80])
	})
})

describe('snapValue', () => {
	// The step grid in the last row holds 11 past max 10, so the clamp comes
	// after the snap.
	it.for<[string, [number, number, number, number], number]>([
		['snaps a value down to the nearest step', [7, 0, 100, 5], 5],
		['snaps a value up to the nearest step', [8, 0, 100, 5], 10],
		['offsets the step grid by min', [13, 3, 100, 5], 13],
		['clamps a grid value past max into the bound', [9.6, 2, 10, 3], 10],
	])('%s', ([, args, expected]) => {
		expect(snapValue(...args)).toBe(expected)
	})
})

describe('Slider + Control', () => {
	it('surfaces invalid state from an enclosing Control', () => {
		const { container } = renderUI(
			<Control severity="error">
				<Slider />
			</Control>,
		)

		const el = bySlot(container, 'slider')

		expect(el).toHaveAttribute('aria-invalid', 'true')

		expect(el).toHaveAttribute('data-invalid')
	})

	it('points aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="vol" severity="error">
				<Description>Pick a level</Description>
				<Slider />
				<Message>Required</Message>
			</Control>,
		)

		const describedBy = bySlot(container, 'slider')?.getAttribute('aria-describedby')

		expect(describedBy).toContain('vol-description')

		expect(describedBy).toContain('vol-error')
	})
})

describe('RangeSlider + Control', () => {
	it('inherits disabled from an enclosing Control', () => {
		const { container } = renderUI(
			<Control disabled>
				<RangeSlider />
			</Control>,
		)

		expect(getSlot(container, 'slider-range')).toHaveAttribute('data-disabled')

		for (const thumb of allBySlot(container, 'slider-range-thumb')) {
			expect(thumb).toBeDisabled()

			expect(thumb).toHaveAttribute('tabindex', '-1')
		}
	})

	it('keeps an explicit disabled={false} over a disabled Control', () => {
		const { container } = renderUI(
			<Control disabled>
				<RangeSlider disabled={false} />
			</Control>,
		)

		for (const thumb of allBySlot(container, 'slider-range-thumb')) {
			expect(thumb).not.toBeDisabled()
		}
	})

	it('points each thumb aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="price" severity="error">
				<Description>Pick a band</Description>
				<RangeSlider />
				<Message>Required</Message>
			</Control>,
		)

		const thumbs = allBySlot(container, 'slider-range-thumb')

		expect(thumbs).toHaveLength(2)

		for (const thumb of thumbs) {
			const describedBy = thumb.getAttribute('aria-describedby')

			expect(describedBy).toContain('price-description')

			expect(describedBy).toContain('price-error')
		}
	})

	it('puts the Control id on the start thumb', () => {
		const { container } = renderUI(
			<Control id="price">
				<RangeSlider />
			</Control>,
		)

		expect(allBySlot(container, 'slider-range-thumb')[0]).toHaveAttribute('id', 'price')
	})

	it('keeps an explicit id over the Control id, and warns that the ids differ', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const { container } = renderUI(
			<Control id="price">
				<RangeSlider id="band" />
			</Control>,
		)

		expect(allBySlot(container, 'slider-range-thumb')[0]).toHaveAttribute('id', 'band')

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('htmlFor="band"'))
	})

	it('names each thumb from the Field label, then the thumb label', () => {
		const { container } = renderUI(
			<Field>
				<Label>Price</Label>
				<RangeSlider labels={['Minimum', 'Maximum']} />
			</Field>,
		)

		const [loThumb, hiThumb] = allBySlot(container, 'slider-range-thumb')

		expect(loThumb).toHaveAccessibleName('Price Minimum')

		expect(hiThumb).toHaveAccessibleName('Price Maximum')
	})

	it('names each thumb from the thumb label alone outside a Field', () => {
		const { container } = renderUI(<RangeSlider labels={['Minimum', 'Maximum']} />)

		const [loThumb, hiThumb] = allBySlot(container, 'slider-range-thumb')

		expect(loThumb).toHaveAccessibleName('Minimum')

		expect(hiThumb).toHaveAccessibleName('Maximum')
	})
})

describe('Slider + Form', () => {
	it('binds to a Form field by name', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ volume: 30 }} onSubmit={onSubmit}>
				<Slider name="volume" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const slider = getSlot<HTMLInputElement>(container, 'slider')

		expect(slider.value).toBe('30')

		fireEvent.change(slider, { target: { value: '60' } })

		const user = setupUser()

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ volume: 60 }),
			expect.anything(),
		)
	})

	it('merges a field-level error from the Form into the invalid state', () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ volume: 30 }}
				validate={{ volume: (v) => (v > 50 ? 'Too loud' : undefined) }}
				validateOn="change"
			>
				<Slider name="volume" />
			</Form>,
		)

		const el = getSlot<HTMLInputElement>(container, 'slider')

		expect(el).not.toHaveAttribute('aria-invalid')

		fireEvent.change(el, { target: { value: '80' } })

		expect(el).toHaveAttribute('aria-invalid', 'true')

		expect(el).toHaveAttribute('data-invalid')

		// The merge is live: a passing value clears the invalid state again.
		fireEvent.change(el, { target: { value: '40' } })

		expect(el).not.toHaveAttribute('aria-invalid')
	})
})

describe('RangeSlider + Form', () => {
	const renderBound = () =>
		renderUI(
			<Form
				defaultValues={{ price: [20, 50] as [number, number] }}
				validate={{ price: (v) => (v[1] > 50 ? 'Too high' : undefined) }}
				validateOn="change"
			>
				<RangeSlider name="price" />
				<FieldProbe name="price" />
			</Form>,
		)

	it.each([0, 1])('marks the bound field touched when focus leaves thumb %i', (index) => {
		const { container } = renderBound()

		const thumb = allBySlot(container, 'slider-range-thumb')[index]

		expect(getFieldProbe('price')).toHaveAttribute('data-touched', 'false')

		fireEvent.blur(thumb as HTMLElement, { relatedTarget: null })

		expect(getFieldProbe('price')).toHaveAttribute('data-touched', 'true')
	})

	it('marks the bound field touched when focus moves to a control outside the widget', () => {
		const { container } = renderUI(
			<Form defaultValues={{ price: [20, 50] as [number, number] }}>
				<RangeSlider name="price" />
				<button type="button">Next</button>
				<FieldProbe name="price" />
			</Form>,
		)

		const [, hi] = allBySlot(container, 'slider-range-thumb')

		fireEvent.blur(hi as HTMLElement, { relatedTarget: screen.getByText('Next') })

		expect(getFieldProbe('price')).toHaveAttribute('data-touched', 'true')
	})

	it('does not mark the field touched when focus moves between the thumbs', () => {
		const { container } = renderBound()

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		fireEvent.blur(lo as HTMLElement, { relatedTarget: hi })

		fireEvent.blur(hi as HTMLElement, { relatedTarget: lo })

		expect(getFieldProbe('price')).toHaveAttribute('data-touched', 'false')
	})

	it('marks each thumb invalid while the bound field holds an error', () => {
		const { container } = renderBound()

		const thumbs = allBySlot(container, 'slider-range-thumb')

		for (const thumb of thumbs) expect(thumb).not.toHaveAttribute('aria-invalid')

		fireEvent.keyDown(thumbs[1] as HTMLElement, { key: 'ArrowRight' })

		for (const thumb of thumbs) {
			expect(thumb).toHaveAttribute('aria-invalid', 'true')

			expect(thumb).toHaveAttribute('data-invalid')
		}

		// The root has no role, so it carries no validation state.
		expect(getSlot(container, 'slider-range')).not.toHaveAttribute('aria-invalid')
	})

	const renderLabeled = (props: Partial<ComponentProps<typeof RangeSlider>> = {}) =>
		renderUI(
			<Form defaultValues={{ price: [20, 50] as [number, number] }}>
				<Field>
					<Label>Price</Label>
					<RangeSlider name="price" labels={['Minimum', 'Maximum']} {...props} />
				</Field>
			</Form>,
		)

	it('focuses the start thumb on a click on the Field label', async () => {
		const { container } = renderLabeled()

		const [lo] = allBySlot(container, 'slider-range-thumb')

		await userEvent.click(screen.getByText('Price'))

		expect(lo).toHaveFocus()
	})

	it('keeps both values and starts no drag on a click on the Field label', async () => {
		const onValueChange = vi.fn()
		const onDragStart = vi.fn()

		const { container } = renderLabeled({ onValueChange, onDragStart })

		await userEvent.click(screen.getByText('Price'))

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '50')

		expect(onValueChange).not.toHaveBeenCalled()

		expect(onDragStart).not.toHaveBeenCalled()
	})

	it('keeps the thumb names after a click on the Field label', async () => {
		const { container } = renderLabeled()

		await userEvent.click(screen.getByText('Price'))

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAccessibleName('Price Minimum')

		expect(hi).toHaveAccessibleName('Price Maximum')
	})

	it('focuses no thumb on a click on the label of a disabled slider', async () => {
		renderLabeled({ disabled: true })

		await userEvent.click(screen.getByText('Price'))

		expect(document.body).toHaveFocus()
	})

	it('focuses the start thumb on a click on a plain label outside a Field', async () => {
		const { container } = renderUI(
			<>
				<label htmlFor="band">Band</label>
				<RangeSlider id="band" />
			</>,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		await userEvent.click(screen.getByText('Band'))

		expect(lo).toHaveFocus()
	})

	it('ignores a click on a label for another control', async () => {
		renderUI(
			<>
				<label htmlFor="other">Other</label>
				<input id="other" />
				<RangeSlider />
			</>,
		)

		await userEvent.click(screen.getByText('Other'))

		expect(screen.getByRole('textbox')).toHaveFocus()
	})
})

describe('RangeSlider in a locale', () => {
	it('names the thumbs in the language of the locale, and keeps given names', () => {
		const { rerender } = renderUI(
			<LocaleProvider locale="es-ES">
				<RangeSlider />
			</LocaleProvider>,
		)

		expect(screen.getByRole('slider', { name: 'Inicio del rango' })).toBeInTheDocument()

		expect(screen.getByRole('slider', { name: 'Fin del rango' })).toBeInTheDocument()

		rerender(
			<LocaleProvider locale="es-ES">
				<RangeSlider labels={['Precio mínimo', 'Precio máximo']} />
			</LocaleProvider>,
		)

		expect(screen.getByRole('slider', { name: 'Precio mínimo' })).toBeInTheDocument()
	})
})
