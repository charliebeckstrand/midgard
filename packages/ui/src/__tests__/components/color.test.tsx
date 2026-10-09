import { act, within as inside, renderHook } from '@testing-library/react'
import { Profiler, useState } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { ColorPanel, ColorPicker } from '../../components/color'
import { ColorPanelView } from '../../components/color/color-panel'
import {
	equalHsva,
	hexToHsva,
	hexToRgba,
	hsvaToCss,
	hsvaToHex,
	hsvaToRgba,
	rgbaToHsva,
} from '../../components/color/color-utilities'
import type { ColorFormat, Hsva } from '../../components/color/types'
import { useColorState } from '../../components/color/use-color-state'
import { Control } from '../../components/control'
import { Field, Label, Message } from '../../components/fieldset'
import { Form, useFormActions } from '../../components/form'
import {
	allBySlot,
	attach,
	bySlot,
	fireEvent,
	getAllSlots,
	getSlot,
	present,
	renderUI,
	screen,
	setupUser,
} from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

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

	it('keeps the hex field left to right under a right-to-left ancestor', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<ColorPanel defaultValue="#ff0000" />
			</div>,
		)

		const frame = present(
			getSlot(container, 'color-hex-input').closest('[data-slot="control-frame"]'),
			'the frame of the hex field',
		)

		expect(frame.closest('[dir]')).toHaveAttribute('dir', 'ltr')
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

	// ColorPanel takes no `name`, so a native form must not submit a checked chip.
	it('keeps a checked swatch out of the data of a native form', () => {
		const { container } = renderUI(
			<form>
				<ColorPanel defaultValue="#ffffff" swatches={['#ffffff', '#000000']} />
			</form>,
		)

		expect(screen.getByRole('radio', { name: '#ffffff' })).toBeChecked()

		const form = present<HTMLFormElement>(container.querySelector('form'), 'the native form')

		expect([...new FormData(form).keys()]).toEqual([])
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

	// `swatches` takes hex only. A preset that does not parse paints its chip,
	// but the chip sets no color and is never checked.
	it('warns in development of a swatch that is not hex, one time for each list', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		onTestFinished(() => warn.mockRestore())

		const { rerender } = renderUI(
			<ColorPanel defaultValue="#ffffff" swatches={['#ffffff', 'red', '#000']} />,
		)

		expect(warn).toHaveBeenCalledTimes(1)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"red"'))

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('#ffffff'))

		// A new array that holds the same presets does not warn again.
		rerender(<ColorPanel defaultValue="#ffffff" swatches={['#ffffff', 'red', '#000']} />)

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('warns of nothing when each swatch is hex', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		onTestFinished(() => warn.mockRestore())

		renderUI(<ColorPanel defaultValue="#ffffff" />)

		renderUI(
			<ColorPanel
				alpha
				defaultValue="#ffffff"
				swatches={['#fff', '#fff8', '#000000', '#00000080']}
			/>,
		)

		expect(warn).not.toHaveBeenCalled()
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

	describe('eyedropper', () => {
		/** Stubs a platform `EyeDropper` whose picker never settles. */
		function stubEyeDropper() {
			vi.stubGlobal(
				'EyeDropper',
				class {
					open = () => new Promise<never>(() => {})
				},
			)

			onTestFinished(() => {
				vi.unstubAllGlobals()
			})
		}

		// A render that does not hydrate draws the button in its first commit,
		// and starts no second render.
		it('draws the eyedropper in the first commit of a client render', () => {
			stubEyeDropper()

			const commits: boolean[] = []

			renderUI(
				<Profiler
					id="panel"
					onRender={() => {
						commits.push(!!document.querySelector('[data-slot="color-eyedropper"]'))
					}}
				>
					<ColorPanel defaultValue="#3b82f6" />
				</Profiler>,
			)

			expect(commits).toEqual([true])
		})

		// The server cannot read the API, so the hydration render agrees with the
		// server output, and the render after it adds the button.
		it('hydrates the server output, and adds the eyedropper after', () => {
			const element = <ColorPanel defaultValue="#3b82f6" />

			const markup = renderToString(element)

			expect(markup).not.toContain('color-eyedropper')

			stubEyeDropper()

			const container = attach(document.createElement('div'))

			container.innerHTML = markup

			const onRecoverableError = vi.fn()

			let root: Root | undefined

			act(() => {
				root = hydrateRoot(container, element, { onRecoverableError })
			})

			onTestFinished(() => act(() => root?.unmount()))

			expect(onRecoverableError).not.toHaveBeenCalled()

			expect(getSlot(container, 'color-eyedropper')).toBeInTheDocument()
		})
	})

	// §7.3: `null` keeps the panel controlled with no color. The panel paints
	// black and ignores `defaultValue`, in each format.
	it('paints black, not defaultValue, for a null value in each format', () => {
		const hex = renderUI(<ColorPanel value={null} defaultValue="#3b82f6" />)

		expect(getSlot(hex.container, 'color-hex-input')).toHaveValue('000000')

		const hsva = renderUI(
			<ColorPanel format="hsva" value={null} defaultValue={{ h: 217, s: 76, v: 96, a: 1 }} />,
		)

		expect(getSlot(hsva.container, 'color-hex-input')).toHaveValue('000000')
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

	it.each([
		['its own prop', <ColorPicker key="prop" defaultValue="#ef4444" readOnly />],
		[
			'an enclosing Control',
			<Control key="control" readOnly>
				<ColorPicker defaultValue="#ef4444" />
			</Control>,
		],
	])('does not open the panel while read-only from %s', (_, ui) => {
		const { container } = renderUI(ui)

		const button = getSlot(container, 'color-picker-button')

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('lets a panel that is open when readOnly turns on close from the trigger', () => {
		const { container, rerender } = renderUI(<ColorPicker defaultValue="#ef4444" />)

		const button = getSlot(container, 'color-picker-button')

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'true')

		rerender(<ColorPicker defaultValue="#ef4444" readOnly />)

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')
	})

	it.each([
		['its own prop', <ColorPicker key="prop" defaultValue="#ef4444" readOnly />],
		[
			'an enclosing Control',
			<Control key="control" readOnly>
				<ColorPicker defaultValue="#ef4444" />
			</Control>,
		],
	])('keeps a trigger that is read-only from %s in the tab order', async (_, ui) => {
		const user = setupUser()

		const { container } = renderUI(ui)

		const button = getSlot(container, 'color-picker-button')

		expect(button).not.toBeDisabled()

		// A button does not take aria-readonly, so the trigger is aria-disabled.
		expect(button).toHaveAttribute('aria-disabled', 'true')

		expect(button).toHaveAttribute('data-readonly')

		await user.tab()

		expect(button).toHaveFocus()

		expect(button).toHaveTextContent('#EF4444')
	})

	it.each([
		['a press', (user: ReturnType<typeof setupUser>, button: HTMLElement) => user.click(button)],
		['Enter', (user: ReturnType<typeof setupUser>) => user.keyboard('{Enter}')],
		['Space', (user: ReturnType<typeof setupUser>) => user.keyboard(' ')],
	])('does not open a read-only picker on %s', async (_, activate) => {
		const user = setupUser()

		const { container } = renderUI(<ColorPicker defaultValue="#ef4444" readOnly />)

		const button = getSlot(container, 'color-picker-button')

		await user.tab()

		expect(button).toHaveFocus()

		await activate(user, button)

		expect(button).toHaveFocus()

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it.each([
		['its own prop', <ColorPicker key="prop" defaultValue="#ef4444" disabled />],
		[
			'an enclosing Control',
			<Control key="control" disabled>
				<ColorPicker defaultValue="#ef4444" />
			</Control>,
		],
		[
			'its own prop, with readOnly',
			<ColorPicker key="both" defaultValue="#ef4444" disabled readOnly />,
		],
	])('keeps native disabled on a trigger that is disabled from %s', (_, ui) => {
		const { container } = renderUI(ui)

		expect(getSlot(container, 'color-picker-button')).toBeDisabled()
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

	// §7.3: an owner clears a controlled picker with `null`. The picker stays
	// controlled, so it paints black and does not go back to `defaultValue`.
	it('paints black when a controlled value goes to null, in each format', () => {
		const hex = renderUI(<ColorPicker value="#ef4444" defaultValue="#3b82f6" />)

		const hexButton = getSlot(hex.container, 'color-picker-button')

		expect(hexButton).toHaveTextContent('#EF4444')

		hex.rerender(<ColorPicker value={null} defaultValue="#3b82f6" />)

		expect(hexButton).toHaveTextContent('#000000')

		const blue = { h: 217, s: 76, v: 96, a: 1 }

		const hsva = renderUI(
			<ColorPicker format="hsva" value={{ h: 0, s: 100, v: 100, a: 1 }} defaultValue={blue} />,
		)

		const hsvaButton = getSlot(hsva.container, 'color-picker-button')

		expect(hsvaButton).toHaveTextContent('#FF0000')

		hsva.rerender(<ColorPicker format="hsva" value={null} defaultValue={blue} />)

		expect(hsvaButton).toHaveTextContent('#000000')
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

	it('marks the bound field touched when its panel closes, so a touched rule runs', () => {
		const { container } = renderUI(
			<Form defaultValues={{}} validate={{ color: (v) => (v ? undefined : 'Pick a color') }}>
				<ColorPicker name="color" />
				<FieldProbe name="color" />
			</Form>,
		)

		const button = getSlot(container, 'color-picker-button')

		// The trigger's own toggle drives both ends. Per §10.3 the floating-ui
		// dismiss paths stay undriven; they close through the same setter.
		fireEvent.click(button)

		expect(getFieldProbe('color')).toHaveAttribute('data-touched', 'false')

		fireEvent.click(button)

		expect(getFieldProbe('color')).toHaveAttribute('data-touched', 'true')

		expect(button).toHaveAttribute('aria-invalid', 'true')
	})

	it('renders a dialog trigger with a color swatch', () => {
		const { container } = renderUI(<ColorPicker defaultValue="#ef4444" />)

		const button = bySlot(container, 'color-picker-button')

		expect(button).toBeInTheDocument()

		expect(button).toHaveAttribute('aria-haspopup', 'dialog')

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(bySlot(container, 'color-picker-swatch')).toBeInTheDocument()
	})

	it('names the open dialog from the trigger with aria-controls', () => {
		const { container } = renderUI(<ColorPicker defaultValue="#ef4444" />)

		const button = getSlot(container, 'color-picker-button')

		expect(button).not.toHaveAttribute('aria-controls')

		fireEvent.click(button)

		const controls = button.getAttribute('aria-controls')

		expect(document.getElementById(controls as string)).toHaveAttribute('role', 'dialog')
	})

	it('keeps the hex label of the trigger left to right under a right-to-left ancestor', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<ColorPicker defaultValue="#ff0000" />
			</div>,
		)

		const label = inside(getSlot(container, 'color-picker-button')).getByText('#FF0000')

		expect(label.closest('[dir]')).toHaveAttribute('dir', 'ltr')
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
			{open && <ColorPanelView hsva={color.hsva} setHsva={color.setHsva} />}
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

	// A drag surface cancels the mousedown of its press, so the press keeps the
	// focus that the drag gives. Each other part takes the focus of a press, so
	// an edited field blurs and commits first. `fireEvent` returns `false` when a
	// handler cancels the press. jsdom does not move focus on a mousedown, so the
	// browser file `color-picker-press-focus` asserts the focus.
	it('holds the press of a drag surface only', () => {
		vi.stubGlobal(
			'EyeDropper',
			class {
				open = () => new Promise<never>(() => {})
			},
		)

		onTestFinished(() => {
			vi.unstubAllGlobals()
		})

		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		expect(fireEvent.mouseDown(getSlot(container, 'color-area'))).toBe(false)

		expect(fireEvent.mouseDown(getSlot(container, 'color-slider'))).toBe(false)

		for (const slot of [
			'color-eyedropper',
			'color-hex-input',
			'copy-button',
			'color-channel-input',
			'color-swatch',
			'color-panel',
		]) {
			expect(fireEvent.mouseDown(getSlot(container, slot)), slot).toBe(true)
		}
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

	// On a gray, the hue does not show, but it is a channel of the hsva value.
	// The owner sets it, so it is not an echo, and the next edit keeps it.
	it('adopts a controlled hsva value that changes only a hue that does not show (§7.2)', () => {
		const onValueChange = vi.fn()

		const { result, rerender } = renderHook(
			({ value }) => useColorState({ value, format: 'hsva', alpha: false, onValueChange }),
			{ initialProps: { value: { h: 0, s: 0, v: 50, a: 1 } } },
		)

		rerender({ value: { h: 210, s: 0, v: 50, a: 1 } })

		expect(result.current.hsva.h).toBe(210)

		act(() => result.current.setHsva((prev) => ({ ...prev, s: 80 })))

		expect(onValueChange).toHaveBeenLastCalledWith({ h: 210, s: 80, v: 50, a: 1 })
	})

	it('keeps hue 360 when an adopting owner wraps the hsva emission to hue 0', () => {
		const { result } = renderHook(() => {
			const [value, setValue] = useState<string | Hsva>({ h: 120, s: 100, v: 100, a: 1 })

			const wrap = (next: string | Hsva) =>
				setValue(typeof next === 'string' ? next : { ...next, h: next.h % 360 })

			return useColorState({ value, format: 'hsva', alpha: false, onValueChange: wrap })
		})

		act(() => result.current.setHsva({ h: 360, s: 100, v: 100, a: 1 }))

		expect(result.current.hsva.h).toBe(360)
	})

	// With `alpha` off, the panel hides the alpha. A held alpha below `1` then
	// stops the match of an opaque swatch, and no edit shows the cause.
	it('pins alpha to 1 when it seeds a translucent color with alpha off', () => {
		const { result } = renderHook(() =>
			useColorState({ defaultValue: '#ff000080', format: 'hex', alpha: false }),
		)

		expect(result.current.hsva.a).toBe(1)
	})

	it('pins alpha to 1 when it adopts a translucent controlled value with alpha off', () => {
		const { result, rerender } = renderHook(
			({ value }) => useColorState({ value, format: 'hex', alpha: false }),
			{ initialProps: { value: '#ff0000' } },
		)

		rerender({ value: '#00ff0080' })

		expect(result.current.hsva).toMatchObject({ h: 120, a: 1 })
	})

	it('pins alpha to 1 when alpha switches off', () => {
		const { result, rerender } = renderHook(
			({ alpha }) => useColorState({ defaultValue: '#ff000080', format: 'hex', alpha }),
			{ initialProps: { alpha: true } },
		)

		expect(result.current.hsva.a).toBeLessThan(1)

		rerender({ alpha: false })

		expect(result.current.hsva.a).toBe(1)
	})
})
