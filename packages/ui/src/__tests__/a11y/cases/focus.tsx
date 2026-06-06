import type { UserEvent } from '@testing-library/user-event'
import { type ReactNode, useState } from 'react'
import { Button } from '../../../components/button'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../../components/command-palette'
import { Field, Label } from '../../../components/fieldset'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { screen } from '../../helpers'
import type { FocusCase } from './types'

/**
 * Stateful trigger harness for the command palette: it takes `open`/`onOpenChange`
 * but ships no built-in trigger, so the gate needs a real button to open it from
 * and to measure focus leaving. `render` receives the live open state and setter.
 */
function Disclosure({
	label,
	render,
}: {
	label: string
	render: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode
}) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				{label}
			</Button>
			{render(open, setOpen)}
		</>
	)
}

/** Clicks the named trigger, waits for `surface` to mount, and returns the
 * trigger so the gate can assert focus has left it for the surface. */
const openFrom = (label: string, surface: () => Promise<unknown>) => async (user: UserEvent) => {
	const trigger = screen.getByRole('button', { name: label })

	await user.click(trigger)

	await surface()

	return trigger
}

/**
 * Focus corpus — dismissable surfaces that move keyboard focus programmatically
 * (an explicit `.focus()` call) when they open, so the entry is observable in
 * jsdom: the command palette's search input, an `autoFocus` popover, and the
 * dropdown panels (menu, select's listbox). The gate (`focus.test.tsx`) asserts
 * focus leaves the trigger for the surface — the focus behaviour axe can't see.
 *
 * The modal Overlay family (dialog/drawer/sheet/confirm) is intentionally absent:
 * its trap finds the first tabbable via floating-ui's layout-dependent `tabbable`
 * pass, which jsdom can't evaluate (no geometry), so its focus entry — like the
 * disabled color-contrast and target-size rules — needs a real-browser layer.
 * Combobox is excluded too: that pattern keeps focus on the input by design.
 */
export const focus: readonly FocusCase[] = [
	[
		// Command palette: a modal search dialog that focuses its search input on
		// open via an explicit initial-focus ref.
		'command palette',
		<Disclosure
			key="fcp"
			label="Open command palette"
			render={(open, onOpenChange) => (
				<CommandPalette open={open} onOpenChange={onOpenChange}>
					{() => (
						<CommandPaletteGroup title="Files">
							<CommandPaletteItem>
								<CommandPaletteLabel>New file</CommandPaletteLabel>
							</CommandPaletteItem>
							<CommandPaletteItem>
								<CommandPaletteLabel>Open file</CommandPaletteLabel>
							</CommandPaletteItem>
						</CommandPaletteGroup>
					)}
				</CommandPalette>
			)}
		/>,
		openFrom('Open command palette', () => screen.findByRole('dialog')),
	],
	[
		// Non-modal popover opted into `autoFocus`: the panel focuses itself on open
		// rather than leaving focus on the trigger.
		'popover',
		<Popover key="fpo">
			<PopoverTrigger>
				<Button variant="outline">Open popover</Button>
			</PopoverTrigger>
			<PopoverContent autoFocus aria-label="Details">
				<Button>Action</Button>
			</PopoverContent>
		</Popover>,
		openFrom('Open popover', () => screen.findByRole('dialog', { name: 'Details' })),
	],
	[
		// Dropdown menu: the panel auto-focuses its first item on open.
		'menu',
		<Menu key="fmn">
			<MenuTrigger>
				<Button variant="outline">Options</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuSection>
					<MenuItem>
						<MenuLabel>Edit</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Duplicate</MenuLabel>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>,
		openFrom('Options', () => screen.findByRole('menu')),
	],
	[
		// Select: clicking the combobox trigger opens its listbox popover, whose
		// panel takes focus off the trigger.
		'select',
		<Field key="fsl">
			<Label>Country</Label>
			<Select placeholder="Select a country" displayValue={(value: string) => value}>
				<SelectOption value="United States">
					<SelectLabel>United States</SelectLabel>
				</SelectOption>
				<SelectOption value="Canada">
					<SelectLabel>Canada</SelectLabel>
				</SelectOption>
			</Select>
		</Field>,
		async (user) => {
			const trigger = screen.getByRole('combobox')

			await user.click(trigger)

			await screen.findByRole('listbox')

			return trigger
		},
	],
]
