import { act, within as inside, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { ColorPanel, ColorPicker } from '../../components/color'
import {
	equalHsva,
	hexToHsva,
	hexToRgba,
	hsvaToCss,
	hsvaToHex,
	hsvaToRgba,
	rgbaToHsva,
} from '../../components/color/color-utilities'
import { SharedColorContext } from '../../components/color/context'
import type { ColorFormat, Hsva } from '../../components/color/types'
import { useColorState } from '../../components/color/use-color-state'
import { Control } from '../../components/control'
import { Field, Label, Message } from '../../components/fieldset'
import { Form, useFormActions } from '../../components/form'
import {
	allBySlot,
	bySlot,
	fireEvent,
	getAllSlots,
	getSlot,
	present,
	renderUI,
	screen,
} from '../helpers'

const within = (a: number, b: number, tolerance = 2) => Math.abs(a - b) <= tolerance

describe('color conversions', () => {
	it('round-trips fully-saturated and neutral hex exactly', () => {
		for (const hex of [
			'#ff0000',
			'#00ff00',
			'#0000ff',
			'#ffff00',
			'#00ffff',
			'#ff00ff',
			'#ffffff',
			'#000000',
			'#808080',
		]) {
			const hsva = hexToHsva(hex)

			expect(hsva).not.toBeNull()

			expect(hsvaToHex(hsva as NonNullable<typeof hsva>)).toBe(hex)
		}
	})

	it('round-trips arbitrary hex within rounding tolerance', () => {
		for (const hex of ['#3b82f6', '#7f3fbf', '#14b8a6']) {
			const out = hsvaToHex(hexToHsva(hex) as NonNullable<ReturnType<typeof hexToHsva>>)

			const a = hexToRgba(hex) as NonNullable<ReturnType<typeof hexToRgba>>

			const b = hexToRgba(out) as NonNullable<ReturnType<typeof hexToRgba>>

			expect(within(a.r, b.r)).toBe(true)

			expect(within(a.g, b.g)).toBe(true)

			expect(within(a.b, b.b)).toBe(true)
		}
	})

	it('parses shorthand and alpha hex, rejecting junk', () => {
		expect(hexToRgba('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 })

		expect(hexToRgba('ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 })

		expect(hexToRgba('#ff000080')?.a).toBeCloseTo(0.502, 2)

		expect(hexToRgba('not-a-color')).toBeNull()

		expect(hexToRgba('#12345')).toBeNull()
	})

	it('emits an 8-digit hex when alpha is requested', () => {
		expect(hsvaToHex({ h: 0, s: 100, v: 100, a: 1 }, true)).toBe('#ff0000ff')

		expect(hsvaToHex({ h: 0, s: 100, v: 100, a: 0.5 }, true)).toBe('#ff000080')
	})

	it('keeps rgb exact through an HSVA round-trip (lossless internal precision)', () => {
		const rgba = { r: 12, g: 200, b: 90, a: 1 }

		expect(hsvaToRgba(rgbaToHsva(rgba))).toEqual(rgba)
	})

	it('reaches every byte value on a channel: the RGB inputs never snap', () => {
		// Full-precision HSV round-trips every RGB byte value exactly
		// (0-255 inclusive).
		for (let n = 0; n <= 255; n++) {
			const base = { r: n, g: 100, b: 200, a: 1 }

			expect(hsvaToRgba(rgbaToHsva(base))).toEqual(base)
		}
	})

	it('ignores hue when saturation or value collapses it', () => {
		expect(equalHsva({ h: 0, s: 0, v: 100, a: 1 }, { h: 200, s: 0, v: 100, a: 1 })).toBe(true)

		expect(equalHsva({ h: 0, s: 0, v: 0, a: 1 }, { h: 200, s: 0, v: 0, a: 1 })).toBe(true)

		expect(equalHsva({ h: 0, s: 100, v: 100, a: 1 }, { h: 120, s: 100, v: 100, a: 1 })).toBe(false)
	})

	it('ignores saturation at zero value, where every saturation renders black', () => {
		expect(equalHsva({ h: 0, s: 0, v: 0, a: 1 }, { h: 200, s: 50, v: 0, a: 1 })).toBe(true)

		expect(equalHsva({ h: 0, s: 100, v: 0, a: 1 }, { h: 0, s: 0, v: 0, a: 1 })).toBe(true)
	})

	it('matches hue 360 to hue 0, because both render the same color', () => {
		expect(equalHsva({ h: 360, s: 100, v: 100, a: 1 }, { h: 0, s: 100, v: 100, a: 1 })).toBe(true)
	})

	it('tells apart two colors that differ by one byte', () => {
		const hsvaOf = (hex: string) => hexToHsva(hex) as Hsva

		// The two colors of each pair have the same rounded HSVA channels, but different bytes.
		for (const [a, b] of [
			['#fefefe', '#ffffff'],
			['#010101', '#000000'],
			['#f04444', '#ef4444'],
			['#ff000081', '#ff000082'],
		] as const) {
			expect(equalHsva(hsvaOf(a), hsvaOf(b)), `${a} and ${b}`).toBe(false)
		}

		expect(equalHsva({ h: 0, s: 100, v: 100, a: 0.5 }, hsvaOf('#ff000080'))).toBe(true)
	})

	it('builds a css rgba fill, dropping alpha unless requested', () => {
		expect(hsvaToCss({ h: 0, s: 100, v: 100, a: 0.5 })).toBe('rgba(255, 0, 0, 1)')

		expect(hsvaToCss({ h: 0, s: 100, v: 100, a: 0.5 }, true)).toBe('rgba(255, 0, 0, 0.5)')
	})
})

describe('ColorPanel', () => {
	// The visible label names each channel input, and no aria-label replaces it.
	it('names each channel input by its visible label', () => {
		renderUI(<ColorPanel defaultValue="#3b82f6" alpha />)

		for (const name of ['R channel', 'G channel', 'B channel', 'Alpha channel']) {
			const input = screen.getByRole('spinbutton', { name })

			expect(input).not.toHaveAttribute('aria-label')

			// The visible letter starts the name (WCAG 2.5.3).
			expect(
				(input as HTMLInputElement).labels?.[0]?.querySelector('[aria-hidden="true"]')?.textContent,
			).toBe(name[0])
		}
	})

	it('keeps the Field identity off the channel inputs', () => {
		const { container } = renderUI(
			<Control required>
				<Field severity="error">
					<Label>Brand color</Label>
					<ColorPanel defaultValue="#3b82f6" />
					<Message>Pick a color</Message>
				</Field>
			</Control>,
		)

		const label = getSlot<HTMLLabelElement>(container, 'label')

		const channels = getAllSlots<HTMLInputElement>(container, 'color-channel-input')

		for (const channel of channels) {
			expect(channel.id).not.toBe(label.htmlFor)

			expect(channel).not.toBeRequired()

			expect(channel).not.toHaveAttribute('aria-describedby')

			expect(channel).not.toHaveAttribute('aria-invalid')
		}
	})

	it('keeps the Field identity off the hex input and its label', () => {
		const { container } = renderUI(
			<Control required>
				<Field severity="error">
					<Label>Brand color</Label>
					<ColorPanel defaultValue="#3b82f6" />
					<Message>Pick a color</Message>
				</Field>
			</Control>,
		)

		const [fieldLabel, ...others] = getAllSlots<HTMLLabelElement>(container, 'label')

		const hex = getSlot<HTMLInputElement>(container, 'color-hex-input')

		expect(hex.tagName).toBe('INPUT')

		expect(hex).not.toBeRequired()

		expect(hex).not.toHaveAttribute('aria-describedby')

		expect(hex).not.toHaveAttribute('aria-invalid')

		expect(hex).toHaveAccessibleName('Hex')

		for (const label of others) expect(label.id).not.toBe(fieldLabel?.id)
	})

	it('renders the area, a hue slider, hex input, and swatches', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		expect(bySlot(container, 'color-panel')).toBeInTheDocument()

		expect(bySlot(container, 'color-area')).toBeInTheDocument()

		expect(bySlot(container, 'color-slider')).toHaveAttribute('data-channel', 'hue')

		expect(bySlot(container, 'color-hex-input')).toBeInTheDocument()

		expect(allBySlot(container, 'color-swatch').length).toBeGreaterThan(0)
	})

	it('supports Home/End and Page keys on the area (APG slider pattern)', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		const area = getSlot(container, 'color-area')

		const brightness = () =>
			Number(/brightness (\d+)%/.exec(area.getAttribute('aria-valuetext') ?? '')?.[1])

		// Home/End pin saturation (the x axis, mirrored by aria-valuenow).
		fireEvent.keyDown(area, { key: 'End' })

		expect(area).toHaveAttribute('aria-valuenow', '100')

		fireEvent.keyDown(area, { key: 'Home' })

		expect(area).toHaveAttribute('aria-valuenow', '0')

		// Page keys take the large step on brightness (the y axis).
		const before = brightness()

		fireEvent.keyDown(area, { key: 'PageDown' })

		expect(brightness()).toBe(before - 10)

		fireEvent.keyDown(area, { key: 'PageUp' })

		expect(brightness()).toBe(before)
	})

	it('supports Page keys on the sliders (APG slider pattern)', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		const slider = getSlot<HTMLInputElement>(container, 'color-slider-input')

		const hue = () => Number(slider.value)

		const before = hue()

		fireEvent.keyDown(slider, { key: 'PageDown' })

		expect(hue()).toBe(before - 10)

		fireEvent.keyDown(slider, { key: 'PageUp' })

		expect(hue()).toBe(before)
	})

	it('adds the alpha slider only when alpha is enabled', () => {
		const { container: opaque } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		expect(allBySlot(opaque, 'color-slider')).toHaveLength(1)

		const { container: translucent } = renderUI(<ColorPanel alpha defaultValue="#3b82f6" />)

		expect(allBySlot(translucent, 'color-slider')).toHaveLength(2)
	})

	it('renders three rgb channel inputs, four with alpha', () => {
		const { container: opaque } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		expect(allBySlot(opaque, 'color-channel-input')).toHaveLength(3)

		const { container: translucent } = renderUI(<ColorPanel alpha defaultValue="#3b82f6" />)

		expect(allBySlot(translucent, 'color-channel-input')).toHaveLength(4)
	})

	it('hides the swatches when swatches is false', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" swatches={false} />)

		expect(allBySlot(container, 'color-swatch')).toHaveLength(0)
	})

	it('exposes the swatches as a named radio group with one checked chip', () => {
		const onValueChange = vi.fn()

		renderUI(
			<ColorPanel
				defaultValue="#ffffff"
				swatches={['#ffffff', '#000000', '#ffffff']}
				onValueChange={onValueChange}
			/>,
		)

		const group = screen.getByRole('radiogroup', { name: 'Swatches' })

		const radios = inside(group).getAllByRole('radio')

		expect(radios).toHaveLength(3)

		// A repeated color checks its first chip only.
		expect(radios.map((radio) => (radio as HTMLInputElement).checked)).toEqual([true, false, false])

		fireEvent.click(screen.getByRole('radio', { name: '#000000' }))

		expect(onValueChange).toHaveBeenLastCalledWith('#000000')

		expect(screen.getByRole('radio', { name: '#000000' })).toBeChecked()

		expect(inside(group).queryAllByRole('button')).toHaveLength(0)
	})

	it('checks no chip for a custom color', () => {
		renderUI(<ColorPanel defaultValue="#123456" swatches={['#ffffff', '#000000']} />)

		for (const radio of screen.getAllByRole('radio')) {
			expect(radio).not.toBeChecked()
		}
	})

	it('gives each chip its own key when the swatches repeat a color', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		onTestFinished(() => error.mockRestore())

		const { container } = renderUI(
			<ColorPanel defaultValue="#3b82f6" swatches={['#ffffff', '#000000', '#ffffff']} />,
		)

		expect(allBySlot(container, 'color-swatch')).toHaveLength(3)

		// React reports a repeated key through `console.error`.
		const keyWarnings = error.mock.calls.filter((args) =>
			args.some((arg) => typeof arg === 'string' && arg.includes('same key')),
		)

		expect(keyWarnings).toEqual([])
	})

	it('commits a shorthand hex only on blur, not while the digits are typed', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<ColorPanel alpha defaultValue="#3b82f6ff" onValueChange={onValueChange} />,
		)

		const hex = getSlot<HTMLInputElement>(container, 'color-hex-input')

		fireEvent.focus(hex)

		// Each prefix of `12345678` that is 3 or 4 digits long parses as shorthand.
		for (const draft of ['1', '12', '123', '1234', '12345', '123456', '1234567']) {
			fireEvent.change(hex, { target: { value: draft } })
		}

		// `123456` is a full hex, so it commits live.
		expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(['#123456ff'])

		fireEvent.change(hex, { target: { value: '12345678' } })

		expect(onValueChange).toHaveBeenLastCalledWith('#12345678')

		// A shorthand that stays in the field commits when the field loses focus.
		fireEvent.change(hex, { target: { value: 'abc' } })

		expect(onValueChange).toHaveBeenCalledTimes(2)

		fireEvent.blur(hex)

		expect(onValueChange).toHaveBeenLastCalledWith('#aabbccff')
	})
})

describe('ColorPicker', () => {
	it('shows the warning ring of an enclosing Control', () => {
		const { container } = renderUI(
			<Control severity="warning">
				<ColorPicker defaultValue="#ef4444" />
			</Control>,
		)

		expect(bySlot(container, 'color-picker-button')).toHaveAttribute('data-warning')
	})

	it('lets an explicit disabled={false} win over a disabled Control', () => {
		const { container } = renderUI(
			<Control disabled>
				<ColorPicker defaultValue="#ef4444" disabled={false} />
			</Control>,
		)

		expect(bySlot(container, 'color-picker-button')).toBeEnabled()
	})

	it('puts no aria-required on the trigger, a button that does not take it', () => {
		const { container } = renderUI(
			<Control required>
				<ColorPicker defaultValue="#ef4444" />
			</Control>,
		)

		const button = getSlot(container, 'color-picker-button')

		expect(button).not.toHaveAttribute('role')

		expect(button).not.toHaveAttribute('aria-required')
	})

	it('paints black, not defaultValue, while the bound field is empty (§7.2)', () => {
		const { container } = renderUI(
			<Form defaultValues={{}}>
				<ColorPicker name="color" defaultValue="#ef4444" />
			</Form>,
		)

		expect(getSlot(container, 'color-picker-button')).toHaveTextContent('#000000')
	})

	it('paints black when the bound field goes back to empty', () => {
		let actions: ReturnType<typeof useFormActions>

		function ActionsCapture() {
			actions = useFormActions()

			return null
		}

		const { container } = renderUI(
			<Form defaultValues={{ color: '#ef4444' }}>
				<ActionsCapture />
				<ColorPicker name="color" />
			</Form>,
		)

		const button = getSlot(container, 'color-picker-button')

		expect(button).toHaveTextContent('#EF4444')

		act(() => actions?.setValue('color', undefined))

		expect(button).toHaveTextContent('#000000')

		act(() => actions?.setValue('color', '#3b82f6'))

		expect(button).toHaveTextContent('#3B82F6')

		act(() => actions?.reset({}))

		expect(button).toHaveTextContent('#000000')
	})

	it('renders a dialog trigger with a color swatch', () => {
		const { container } = renderUI(<ColorPicker defaultValue="#ef4444" />)

		const button = bySlot(container, 'color-picker-button')

		expect(button).toBeInTheDocument()

		expect(button).toHaveAttribute('aria-haspopup', 'dialog')

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(bySlot(container, 'color-picker-swatch')).toBeInTheDocument()
	})

	it('reports both ends of the panel open state, whatever drove them', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<ColorPicker defaultValue="#ef4444" onOpenChange={onOpenChange} />,
		)

		const button = getSlot(container, 'color-picker-button')

		expect(onOpenChange).not.toHaveBeenCalled()

		fireEvent.click(button)

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

		// A close the consumer never drove: the shared dismiss layer.
		fireEvent.keyDown(document.body, { key: 'Escape' })

		expect(onOpenChange).toHaveBeenLastCalledWith(false)

		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	it('leaves the positioning wrapper free of floating-ui popup attributes', () => {
		const { container } = renderUI(<ColorPicker defaultValue="#ef4444" />)

		const button = getSlot(container, 'color-picker-button')

		fireEvent.click(button)

		const wrapper = present(button.closest('[data-slot="control"]'), 'the positioning wrapper')

		// The button hand-rolls `aria-haspopup`/`aria-expanded` and the panel
		// hand-rolls `role="dialog"`, so `useColorPickerState` passes `role: null`
		// and floating-ui's `useRole` stamps nothing on this roleless wrapper. A
		// role here repeats the trigger's popup state on the element above it, so
		// two nodes report one expanded widget. Per §10.3 the real `useRole` stays
		// undriven: the double stamps `aria-describedby` alone, which is the entry
		// that fails on the unfixed source. The other four state the contract; the
		// real engine puts them on the reference, and only a browser-suite test
		// drives that.
		for (const attribute of [
			'role',
			'aria-haspopup',
			'aria-expanded',
			'aria-controls',
			'aria-describedby',
		]) {
			expect(wrapper).not.toHaveAttribute(attribute)
		}
	})
})

type PickerHarnessProps = {
	open: boolean
	initial: string | Hsva
	format: ColorFormat
	onValueChange?: (value: string | Hsva) => void
}

/**
 * The parts of `ColorPicker` that own the color, with no popover. An owner
 * adopts each emission, and `useColorState` holds the HSVA of the picker. The
 * `picker-color` slot shows that HSVA, as the trigger does. The popover mounts
 * the panel only while `open`. A real open drives floating-ui and the exit of
 * the Portal, which §10.3 bars.
 */
function PickerHarness({ open, initial, format, onValueChange }: PickerHarnessProps) {
	const [value, setValue] = useState(initial)

	const color = useColorState({
		value,
		format,
		alpha: false,
		onValueChange: (next) => {
			onValueChange?.(next)

			setValue(next)
		},
	})

	return (
		<>
			<span data-slot="picker-color">{hsvaToHex(color.hsva)}</span>
			<SharedColorContext value={color}>{open && <ColorPanel />}</SharedColorContext>
		</>
	)
}

describe('ColorPanel in a ColorPicker', () => {
	it('keeps the hue that hex drops after the panel mounts again', () => {
		const { container, rerender } = renderUI(<PickerHarness open initial="#000000" format="hex" />)

		const hue = () => getSlot<HTMLInputElement>(container, 'color-slider-input')

		fireEvent.change(hue(), { target: { value: '120' } })

		// Black has no hue in hex, so the emission does not change.
		expect(getSlot(container, 'picker-color')).toHaveTextContent('#000000')

		// A close unmounts the panel, and the next open mounts it again.
		rerender(<PickerHarness open={false} initial="#000000" format="hex" />)

		rerender(<PickerHarness open initial="#000000" format="hex" />)

		expect(hue()).toHaveValue('120')
	})

	it('gives the picker the full precision of a panel edit, and rounds only the emission', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<PickerHarness
				open
				initial={{ h: 0, s: 0, v: 0, a: 1 }}
				format="hsva"
				onValueChange={onValueChange}
			/>,
		)

		// `#7f7f7f` is v 49.8. The rounded v 50 paints `#808080`.
		fireEvent.change(getSlot(container, 'color-hex-input'), { target: { value: '7f7f7f' } })

		expect(getSlot(container, 'picker-color')).toHaveTextContent('#7f7f7f')

		expect(onValueChange).toHaveBeenLastCalledWith({ h: 0, s: 0, v: 50, a: 1 })
	})

	// The content wrapper of the picker cancels each mousedown, so a drag on the
	// area keeps focus in the panel. The eyedropper press must escape that hold.
	// Focus then leaves an edited field, and its blur commit runs before the pick.
	// The dialog here is the hold without floating-ui (§10.3). jsdom does not
	// move focus on a mousedown, so the case asserts the escape, not the focus.
	it('lets an eyedropper press escape the mousedown hold of the picker', () => {
		vi.stubGlobal(
			'EyeDropper',
			class {
				open = () => new Promise<never>(() => {})
			},
		)

		onTestFinished(() => {
			vi.unstubAllGlobals()
		})

		const hold = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())

		const { container } = renderUI(
			<div role="dialog" aria-label="Choose color" onMouseDown={hold}>
				<ColorPanel defaultValue="#3b82f6" />
			</div>,
		)

		// The hold catches a press on the area, the drag that it is for.
		fireEvent.mouseDown(getSlot(container, 'color-area'))

		expect(hold).toHaveBeenCalledTimes(1)

		// `fireEvent` returns `false` when a handler cancels the press.
		expect(fireEvent.mouseDown(getSlot(container, 'color-eyedropper'))).toBe(true)

		expect(hold).toHaveBeenCalledTimes(1)
	})
})

describe('useColorState', () => {
	it('snaps back to a controlled value that the owner does not adopt (§7.2)', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() =>
			useColorState({ value: '#ff0000', format: 'hex', alpha: false, onValueChange }),
		)

		act(() => result.current.setHsva({ h: 120, s: 100, v: 100, a: 1 }))

		expect(onValueChange).toHaveBeenCalledWith('#00ff00')

		expect(result.current.hsva).toMatchObject({ h: 0, s: 100, v: 100 })
	})

	it('keeps the hue when an adopting owner echoes a grayscale emission', () => {
		const { result } = renderHook(() => {
			const [value, setValue] = useState<string | Hsva>('#ff0000')

			return useColorState({ value, format: 'hex', alpha: false, onValueChange: setValue })
		})

		act(() => result.current.setHsva({ h: 120, s: 0, v: 100, a: 1 }))

		expect(result.current.hsva).toMatchObject({ h: 120, s: 0, v: 100 })
	})
})
