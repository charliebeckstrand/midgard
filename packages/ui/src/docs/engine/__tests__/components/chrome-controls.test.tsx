import { describe, expect, it, vi } from 'vitest'
import { OptionsListbox } from '../../components/options-listbox'
import { SidebarContent } from '../../components/sidebar'
import { ValueStepper } from '../../components/value-stepper'
import { initRegistry } from '../../registry'
import { fireEvent, renderUI, screen } from '../helpers'

describe('sidebar item', () => {
	// `fireEvent` returns false when a handler called `preventDefault`.
	it('leaves each click to the browser, which follows the hash link', () => {
		initRegistry({ './demos/components/alpha.tsx': () => Promise.resolve(() => null) })

		renderUI(<SidebarContent route="" />)

		const link = screen.getByRole('link', { name: 'Alpha' })

		expect(link).toHaveAttribute('href', '#alpha')

		expect(fireEvent.click(link, { metaKey: true })).toBe(true)

		expect(fireEvent.click(link)).toBe(true)
	})

	it('gives the docs search no autofill and no typing suggestions', () => {
		initRegistry({ './demos/components/alpha.tsx': () => Promise.resolve(() => null) })

		renderUI(<SidebarContent route="" />)

		const search = screen.getByPlaceholderText('Search docs')

		expect(search).toHaveAttribute('autocomplete', 'off')

		expect(search).toHaveAttribute('autocorrect', 'off')

		expect(search).toHaveAttribute('spellcheck', 'false')
	})
})

describe('ValueStepper', () => {
	it('names each button after what it drives', () => {
		renderUI(<ValueStepper label="step" value={1} max={3} onValueChange={() => {}} />)

		expect(screen.getByRole('button', { name: 'Decrease step' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Increase step' })).toBeInTheDocument()
	})

	// A native `disabled` would drop the focus to `<body>` at the bound.
	it('keeps a button at its bound focusable, and ignores its press', () => {
		const onValueChange = vi.fn()

		renderUI(<ValueStepper label="step" value={0} max={3} onValueChange={onValueChange} />)

		const decrease = screen.getByRole('button', { name: 'Decrease step' })

		expect(decrease).toHaveAttribute('aria-disabled', 'true')

		expect(decrease).not.toBeDisabled()

		decrease.focus()

		fireEvent.click(decrease)

		expect(onValueChange).not.toHaveBeenCalled()

		expect(decrease).toHaveFocus()

		fireEvent.click(screen.getByRole('button', { name: 'Increase step' }))

		expect(onValueChange).toHaveBeenCalledWith(1)
	})
})

describe('OptionsListbox', () => {
	it('names its trigger with its label, and shows the value', () => {
		renderUI(
			<OptionsListbox
				label="Density"
				options={[
					{ value: 'snug', label: 'Snug' },
					{ value: 'roomy', label: 'Roomy' },
				]}
				value="snug"
				onValueChange={() => {}}
			/>,
		)

		const trigger = screen.getByRole('combobox', { name: 'Density' })

		expect(trigger).toHaveTextContent('Snug')
	})
})
