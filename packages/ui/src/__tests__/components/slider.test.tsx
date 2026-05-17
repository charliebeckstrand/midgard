import { describe, expect, it, vi } from 'vitest'
import { RangeSlider, Slider } from '../../components/slider'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

describe('Slider', () => {
	it('renders with data-slot="slider"', () => {
		const { container } = renderUI(<Slider />)

		const el = bySlot(container, 'slider')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('INPUT')
	})

	it('renders as a range input', () => {
		const { container } = renderUI(<Slider />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el.type).toBe('range')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Slider className="custom" />)

		const el = bySlot(container, 'slider')

		expect(el?.className).toContain('custom')
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
})

describe('RangeSlider', () => {
	it('renders with data-slot="slider-range"', () => {
		const { container } = renderUI(<RangeSlider />)

		expect(bySlot(container, 'slider-range')).toBeInTheDocument()
	})

	it('renders two thumbs with slider roles', () => {
		const { container } = renderUI(<RangeSlider />)

		expect(allBySlot(container, 'slider-range-thumb')).toHaveLength(2)
	})

	it('applies custom className to the root', () => {
		const { container } = renderUI(<RangeSlider className="custom" />)

		expect(bySlot(container, 'slider-range')?.className).toContain('custom')
	})

	it('sets aria-valuenow on each thumb to reflect the default value', () => {
		const { container } = renderUI(<RangeSlider defaultValue={[25, 75]} />)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		expect(lo).toHaveAttribute('aria-valuenow', '25')

		expect(hi).toHaveAttribute('aria-valuenow', '75')
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
