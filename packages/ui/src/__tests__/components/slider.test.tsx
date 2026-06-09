import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Description, Message } from '../../components/fieldset'
import { RangeSlider, Slider } from '../../components/slider'
import { snapToStep } from '../../components/slider/range/range-utilities'
import { allBySlot, bySlot, describeDensityContract, fireEvent, renderUI } from '../helpers'

describe('Slider', () => {
	it('renders as a range input with data-slot="slider"', () => {
		const { container } = renderUI(<Slider />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el).toBeInTheDocument()

		expect(el.type).toBe('range')
	})

	it('passes through min, max, and step', () => {
		const { container } = renderUI(<Slider min={0} max={50} step={5} />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el.min).toBe('0')

		expect(el.max).toBe('50')

		expect(el.step).toBe('5')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Slider id="test" />)

		const el = bySlot(container, 'slider')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('fires onValueChange on input', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<Slider defaultValue={20} onValueChange={onValueChange} />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		fireEvent.change(el, { target: { value: '50' } })

		expect(onValueChange).toHaveBeenCalledWith(50)
	})

	it('reflects a controlled value', () => {
		const { container } = renderUI(<Slider value={42} onValueChange={() => {}} />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el.value).toBe('42')
	})

	it('merges caller-supplied inline style with the slider --slider-value var', () => {
		const { container } = renderUI(<Slider defaultValue={25} style={{ width: '300px' }} />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el.style.width).toBe('300px')
	})
})

describe('RangeSlider', () => {
	it('renders two thumbs with slider roles', () => {
		const { container } = renderUI(<RangeSlider />)

		expect(allBySlot(container, 'slider-range-thumb')).toHaveLength(2)
	})

	it('sets aria-valuenow on each thumb to reflect the default value', () => {
		const { container } = renderUI(<RangeSlider defaultValue={[25, 75]} />)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAttribute('aria-valuenow', '25')

		expect(hi).toHaveAttribute('aria-valuenow', '75')
	})

	it('names the thumbs generically by default', () => {
		const { container } = renderUI(<RangeSlider />)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAttribute('aria-label', 'Range start')

		expect(hi).toHaveAttribute('aria-label', 'Range end')
	})

	it('accepts per-thumb labels', () => {
		const { container } = renderUI(<RangeSlider labels={['Min price', 'Max price']} />)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAttribute('aria-label', 'Min price')

		expect(hi).toHaveAttribute('aria-label', 'Max price')
	})

	it('moves the low thumb right when ArrowRight is pressed', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[10, 90]} step={5} onValueChange={onChange} />,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(lo as HTMLElement, { key: 'ArrowRight' })

		expect(onChange).toHaveBeenCalledWith([15, 90])
	})

	it('moves the high thumb left when ArrowLeft is pressed', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[10, 90]} step={5} onValueChange={onChange} />,
		)

		const [, hi] = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(hi as HTMLElement, { key: 'ArrowLeft' })

		expect(onChange).toHaveBeenCalledWith([10, 85])
	})

	it('snaps the low thumb to min when Home is pressed', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[40, 90]} min={0} max={100} onValueChange={onChange} />,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(lo as HTMLElement, { key: 'Home' })

		expect(onChange).toHaveBeenCalledWith([0, 90])
	})

	it('snaps the high thumb to max when End is pressed', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[10, 60]} min={0} max={100} onValueChange={onChange} />,
		)

		const [, hi] = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(hi as HTMLElement, { key: 'End' })

		expect(onChange).toHaveBeenCalledWith([10, 100])
	})

	it('ignores unrelated keys', () => {
		const onChange = vi.fn()

		const { container } = renderUI(<RangeSlider defaultValue={[10, 90]} onValueChange={onChange} />)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(lo as HTMLElement, { key: 'a' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('prevents the low thumb from crossing the high thumb when allowCross is false', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<RangeSlider defaultValue={[48, 50]} step={5} allowCross={false} onValueChange={onChange} />,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		fireEvent.keyDown(lo as HTMLElement, { key: 'ArrowRight' })

		expect(onChange).toHaveBeenCalledWith([50, 50])
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
})

describeDensityContract('RangeSlider density inheritance', {
	render: (size) => <RangeSlider size={size} />,
	slot: 'slider-range',
	// The root size variant brings a unique py-* hit-area class.
	classFor: { sm: 'py-3', md: 'py-4', lg: 'py-5' },
})

describe('snapToStep', () => {
	it('snaps a value down to the nearest step', () => {
		expect(snapToStep(7, 0, 5)).toBe(5)
	})

	it('snaps a value up to the nearest step', () => {
		expect(snapToStep(8, 0, 5)).toBe(10)
	})

	it('offsets the step grid by min', () => {
		expect(snapToStep(13, 3, 5)).toBe(13)
	})
})

describe('Slider + Control', () => {
	it('surfaces invalid state from an enclosing Control', () => {
		const { container } = renderUI(
			<Control invalid>
				<Slider />
			</Control>,
		)

		const el = bySlot(container, 'slider')

		expect(el).toHaveAttribute('aria-invalid', 'true')

		expect(el).toHaveAttribute('data-invalid')
	})

	it('points aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="vol" invalid>
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

describeDensityContract('Slider density inheritance', {
	render: (size) => <Slider size={size} />,
	slot: 'slider',
	// Each size variant brings a unique py-* hit-area class; matching it
	// confirms which size the recipe actually rendered.
	classFor: { sm: 'py-3', md: 'py-4', lg: 'py-5' },
})
