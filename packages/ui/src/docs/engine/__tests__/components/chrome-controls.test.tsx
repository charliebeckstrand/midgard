import { waitFor } from '@testing-library/react'
import { createRoutesStub, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { UIProvider } from '../../../../providers/ui'
import { RouterLink } from '../../app'
import { OptionsListbox } from '../../components/options-listbox'
import { SidebarContent } from '../../components/sidebar'
import { ValueStepper } from '../../components/value-stepper'
import { initRegistry } from '../../registry'
import { fireEvent, renderUI, screen } from '../helpers'

describe('sidebar item', () => {
	it('links to the path of its demo, and the router follows it in place', async () => {
		initRegistry({ './demos/components/alpha.tsx': () => Promise.resolve(() => null) })

		function Path() {
			return <output>{useLocation().pathname}</output>
		}

		const Stub = createRoutesStub([
			{
				path: '/*',
				Component: () => (
					<UIProvider link={RouterLink}>
						<SidebarContent route="" />
						<Path />
					</UIProvider>
				),
			},
		])

		renderUI(<Stub initialEntries={['/']} />)

		const link = await screen.findByRole('link', { name: 'Alpha' })

		expect(link).toHaveAttribute('href', '/alpha')

		fireEvent.click(link)

		await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/alpha'))
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
