import { useEffect } from 'react'
import { Button } from '../../../components/button'
import { ColorPanelSkeleton, ColorPicker, ColorPickerSkeleton } from '../../../components/color'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { useComboboxQuery } from '../../../components/combobox/use-combobox-query'
import { DatePicker, DatePickerSkeleton } from '../../../components/date-picker'
import { Field, Label } from '../../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { PdfViewer, type PdfViewerPage } from '../../../components/pdf-viewer'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { PopoverPanel } from '../../../primitives/popover'
import { noop, screen } from '../../helpers'
import type { InteractiveCase } from './types'

const interactivePeople = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb']

/** One pre-rendered page, so the viewer needs no pdf.js and its toolbar is live. */
const interactivePdfPages: PdfViewerPage[] = [
	{ id: 'p1', src: '/page-1.png', label: 'Page 1', width: 816, height: 1056 },
]

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
 * Clicks the first element with the `data-slot` of `slot` once, on mount. A
 * subject with no prop that opens it uses the click, as a reader does. Used by
 * the disclosure subject of the color picker.
 */
function ClickOnMount({ slot }: { slot: string }) {
	useEffect(() => {
		document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)?.click()
	}, [slot])

	return null
}

/**
 * Interactive corpus: overlays with no controlled-open prop. Each case carries
 * an `open` step that drives the real interaction before asserting against
 * `document.body`. Covers hover/focus tooltips and the listbox/calendar popovers
 * that only open on click or typing.
 */
export const interactive: readonly InteractiveCase[] = [
	{
		// Tooltip: role-bearing panel appears on the trigger; only mounts on
		// hover/focus, with no controlled-open prop.
		name: 'tooltip',
		element: (
			<Tooltip key="itt">
				<TooltipTrigger>
					<Button variant="outline">Hover me</Button>
				</TooltipTrigger>
				<TooltipContent>This is a tooltip</TooltipContent>
			</Tooltip>
		),
		open: async (user) => {
			await user.click(screen.getByRole('button', { name: 'Hover me' }))

			await screen.findByText('This is a tooltip')
		},
		disclosure: [
			{
				// A host child, so the trigger writes its own `data-slot`. The `open`
				// prop holds the tooltip open.
				component: 'Tooltip',
				render: ({ open }) => (
					<Tooltip open={open}>
						<TooltipTrigger>
							<button type="button">Hover me</button>
						</TooltipTrigger>
						<TooltipContent>This is a tooltip</TooltipContent>
					</Tooltip>
				),
				parts: ['tooltip-content'],
			},
		],
	},
	{
		// Combobox driven through its filter: type to narrow, then the option
		// listbox mounts with the matched options.
		name: 'combobox (filtered)',
		element: (
			<Field key="icb">
				<Label>Assignee</Label>
				<Combobox displayValue={(value: string) => value} placeholder="Select a person">
					<FilteredPeople />
				</Combobox>
			</Field>
		),
		open: async (user) => {
			const input = screen.getByRole('combobox')

			await user.click(input)
			await user.type(input, 'a')

			await screen.findByRole('listbox')
		},
		disclosure: [
			{
				component: 'Combobox',
				render: ({ open, disabled }) => (
					<Combobox
						aria-label="Assignee"
						displayValue={(value: string) => value}
						open={open}
						onOpenChange={noop}
						disabled={disabled}
					>
						<FilteredPeople />
					</Combobox>
				),
				parts: ['combobox-input', 'control-frame', 'popover-panel'],
				disabledParts: ['combobox-input'],
			},
		],
	},
	{
		// Select: the trigger opens its listbox popover on click.
		name: 'select',
		element: (
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
			</Field>
		),
		open: async (user) => {
			await user.click(screen.getByRole('combobox'))

			await screen.findByRole('listbox')
		},
		disclosure: [
			{
				component: 'Select',
				render: ({ open, disabled }) => (
					<Select<string> aria-label="Country" open={open} onOpenChange={noop} disabled={disabled}>
						<SelectOption value="Canada">
							<SelectLabel>Canada</SelectLabel>
						</SelectOption>
					</Select>
				),
				parts: ['listbox-button', 'control-frame', 'popover-panel'],
				disabledParts: ['listbox-button'],
			},
		],
	},
	{
		// Listbox: a role="combobox" trigger opens its option listbox popover on
		// click. The popover portals to document.body; this case drives it open to
		// reach the listbox / option ARIA structure.
		name: 'listbox',
		element: (
			<Field key="ilb">
				<Label>Status</Label>
				<Listbox<string>
					nullable
					displayValue={(value: string) => value}
					placeholder="Select status"
				>
					<ListboxOption value="active">
						<ListboxLabel>Active</ListboxLabel>
					</ListboxOption>
					<ListboxOption value="paused">
						<ListboxLabel>Paused</ListboxLabel>
					</ListboxOption>
				</Listbox>
			</Field>
		),
		open: async (user) => {
			await user.click(screen.getByRole('combobox'))

			await screen.findByRole('listbox')
		},
		disclosure: [
			{
				component: 'Listbox',
				render: ({ open, disabled }) => (
					<Listbox<string> aria-label="Status" open={open} onOpenChange={noop} disabled={disabled}>
						<ListboxOption value="active">
							<ListboxLabel>Active</ListboxLabel>
						</ListboxOption>
					</Listbox>
				),
				parts: ['listbox-button', 'control-frame', 'popover-panel'],
				disabledParts: ['listbox-button'],
			},
			{
				// The panel of the listbox, alone: it stamps the open state that its
				// owner passes, and it has no disabled state.
				component: 'PopoverPanel',
				render: ({ open }) => (
					<PopoverPanel open={open} aria-label="Status" autoFocus={false}>
						<div role="option" tabIndex={-1} aria-selected={false}>
							Active
						</div>
					</PopoverPanel>
				),
				parts: ['popover-panel'],
			},
		],
	},
	{
		// Date picker: the trigger opens its calendar popover on click.
		name: 'date picker',
		element: (
			<Field key="idp">
				<Label>Start date</Label>
				<DatePicker />
			</Field>
		),
		open: async (user) => {
			const trigger = document.querySelector('[data-slot="datepicker-button"]')

			if (trigger) await user.click(trigger as HTMLElement)

			await screen.findByRole('button', { name: 'Today' })
		},
		skeleton: [{ element: <DatePickerSkeleton range />, absentSlot: 'datepicker-button' }],
		disclosure: [
			{
				component: 'DatePicker',
				render: ({ open, disabled }) => (
					<DatePicker aria-label="Start date" defaultOpen={open} disabled={disabled} />
				),
				parts: ['datepicker-button', 'control-frame', 'floating-surface'],
				disabledParts: ['datepicker-button'],
			},
		],
	},
	{
		// Magnifier settings: in `mode: 'config'` the viewer's toolbar carries a button
		// that opens a dialog instead of a switch. The switch, the three radio groups and
		// their legends only mount on open, so this case drives it open to assert them —
		// the group naming in particular, since a `<legend>` does not name the
		// `role="radiogroup"` div the options sit in.
		name: 'pdf viewer magnifier settings',
		element: (
			<PdfViewer
				key="ims"
				pages={interactivePdfPages}
				magnifier={{ mode: 'config' }}
				aria-label="Quarterly report"
			/>
		),
		open: async (user) => {
			await user.click(screen.getByRole('button', { name: 'Magnifier settings' }))

			await screen.findByRole('dialog')
		},
	},
	{
		// Color picker: a Control-integrated swatch trigger opens its picker dialog
		// (role="dialog", aria-label="Choose color") on click. The panel's 2D
		// saturation/brightness slider, hue/alpha sliders, swatches, and hex/channel
		// inputs only mount on open; this case drives it open to assert that surface.
		name: 'color picker',
		element: (
			<Field key="icp">
				<Label>Brand color</Label>
				<ColorPicker alpha defaultValue="#6366F1" />
			</Field>
		),
		open: async (user) => {
			const trigger = document.querySelector('[data-slot="color-picker-button"]')

			if (trigger) await user.click(trigger as HTMLElement)

			await screen.findByRole('dialog')
		},
		skeleton: [
			{ element: <ColorPanelSkeleton />, absentSlot: 'color-panel' },
			{ element: <ColorPickerSkeleton alpha />, absentSlot: 'color-picker-button' },
		],
		disclosure: [
			{
				// The picker has no prop that opens it, so a click opens it.
				component: 'ColorPicker',
				render: ({ open, disabled }) => (
					<>
						<ColorPicker defaultValue="#6366F1" disabled={disabled} />
						{open && <ClickOnMount slot="color-picker-button" />}
					</>
				),
				parts: ['color-picker-button', 'control-frame', 'floating-surface'],
				disabledParts: ['color-picker-button'],
			},
		],
	},
]
