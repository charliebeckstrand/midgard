import { Button } from '../../../components/button'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { DatePicker } from '../../../components/date-picker'
import { Field, Label } from '../../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Map as MapView } from '../../../components/map'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { screen, waitFor } from '../../helpers'
import type { InteractiveCase } from './types'

const interactivePeople = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb']

/**
 * Interactive corpus — overlays with no controlled-open prop, so the gate must
 * drive them open through a real interaction (`open`) before asserting against
 * `document.body`. Covers the surfaces the `overlays` corpus can't author
 * statically: hover/focus tooltips and the listbox/calendar popovers that only
 * open on click or typing.
 */
export const interactive: readonly InteractiveCase[] = [
	[
		// Tooltip: role-bearing panel appears on the trigger; only mounts on
		// hover/focus, with no controlled-open prop.
		'tooltip',
		<Tooltip key="itt">
			<TooltipTrigger>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>This is a tooltip</TooltipContent>
		</Tooltip>,
		async (user) => {
			await user.click(screen.getByRole('button', { name: 'Hover me' }))

			await screen.findByText('This is a tooltip')
		},
	],
	[
		// Combobox driven through its filter: type to narrow, then the option
		// listbox mounts with the matched options.
		'combobox (filtered)',
		<Field key="icb">
			<Label>Assignee</Label>
			<Combobox displayValue={(value: string) => value} placeholder="Select a person">
				{(query) =>
					interactivePeople
						.filter((person) => !query || person.toLowerCase().includes(query.toLowerCase()))
						.map((person) => (
							<ComboboxOption key={person} value={person}>
								<ComboboxLabel>{person}</ComboboxLabel>
							</ComboboxOption>
						))
				}
			</Combobox>
		</Field>,
		async (user) => {
			const input = screen.getByRole('combobox')

			await user.click(input)
			await user.type(input, 'a')

			await screen.findByRole('listbox')
		},
	],
	[
		// Select: the trigger opens its listbox popover on click.
		'select',
		<Field key="isl">
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
			await user.click(screen.getByRole('combobox'))

			await screen.findByRole('listbox')
		},
	],
	[
		// Listbox: a role="combobox" trigger opens its option listbox popover on
		// click. The closed baseline case only sees the trigger button (the popover
		// portals to document.body), so this drives it open to assert the listbox /
		// option ARIA structure the container-scoped gate can't reach.
		'listbox',
		<Field key="ilb">
			<Label>Status</Label>
			<Listbox<string> nullable displayValue={(value: string) => value} placeholder="Select status">
				<ListboxOption value="active">
					<ListboxLabel>Active</ListboxLabel>
				</ListboxOption>
				<ListboxOption value="paused">
					<ListboxLabel>Paused</ListboxLabel>
				</ListboxOption>
			</Listbox>
		</Field>,
		async (user) => {
			await user.click(screen.getByRole('combobox'))

			await screen.findByRole('listbox')
		},
	],
	[
		// Date picker: the trigger opens its calendar popover on click.
		'date picker',
		<Field key="idp">
			<Label>Start date</Label>
			<DatePicker />
		</Field>,
		async (user) => {
			const trigger = document.querySelector('[data-slot="datepicker-button"]')

			if (trigger) await user.click(trigger as HTMLElement)

			await screen.findByRole('button', { name: 'Today' })
		},
	],
	[
		// Map (maplibre globally mocked): a labelled role="application" region. No
		// interaction — just wait for the async load to settle before asserting.
		'map',
		<MapView key="imap" label="Delivery map" />,
		async () => {
			await waitFor(() => {
				const el = document.querySelector('[data-slot="map"]')

				if (el?.getAttribute('data-ready') !== 'true') throw new Error('map not ready')
			})
		},
	],
]
