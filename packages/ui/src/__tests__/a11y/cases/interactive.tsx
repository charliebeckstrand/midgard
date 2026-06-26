import { Button } from '../../../components/button'
import { ColorPicker } from '../../../components/color'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	useComboboxQuery,
} from '../../../components/combobox'
import { DatePicker } from '../../../components/date-picker'
import { Field, Label } from '../../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { Map as MapView } from '../../../modules/map'
import { screen, waitFor } from '../../helpers'
import type { InteractiveCase } from './types'

const interactivePeople = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb']

function FilteredPeople() {
	const { deferredQuery } = useComboboxQuery()

	return interactivePeople
		.filter(
			(person) => !deferredQuery || person.toLowerCase().includes(deferredQuery.toLowerCase()),
		)
		.map((person) => (
			<ComboboxOption key={person} value={person}>
				<ComboboxLabel>{person}</ComboboxLabel>
			</ComboboxOption>
		))
}

/**
 * Interactive corpus: overlays with no controlled-open prop. Each case carries
 * an `open` step that drives the real interaction before asserting against
 * `document.body`. Covers hover/focus tooltips and the listbox/calendar popovers
 * that only open on click or typing.
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
				<FilteredPeople />
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
		// click. The popover portals to document.body; this case drives it open to
		// reach the listbox / option ARIA structure.
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
		// Colour picker: a Control-integrated swatch trigger opens its picker dialog
		// (role="dialog", aria-label="Choose color") on click. The panel's 2D
		// saturation/brightness slider, hue/alpha sliders, swatches, and hex/channel
		// inputs only mount on open; this case drives it open to assert that surface.
		'color picker',
		<Field key="icp">
			<Label>Brand color</Label>
			<ColorPicker alpha defaultValue="#6366F1" />
		</Field>,
		async (user) => {
			const trigger = document.querySelector('[data-slot="color-picker-button"]')

			if (trigger) await user.click(trigger as HTMLElement)

			await screen.findByRole('dialog')
		},
	],
	[
		// Map (maplibre globally mocked): a labelled role="application" region;
		// waits for the async load to settle before asserting.
		'map',
		<MapView key="imap" label="Delivery map" />,
		async () => {
			await waitFor(() => {
				const el = document.querySelector('[data-slot="map"]')

				if (!el?.hasAttribute('data-ready')) throw new Error('map not ready')
			})
		},
	],
]
