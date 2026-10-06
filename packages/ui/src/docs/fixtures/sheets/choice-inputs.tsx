import { Checkbox, CheckboxField, CheckboxGroup } from '../../../components/checkbox'
import { ColorPanel, ColorPicker } from '../../../components/color'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { Control } from '../../../components/control'
import { Description, Field, Label, Message } from '../../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Radio, RadioField, RadioGroup } from '../../../components/radio'
import { Rating } from '../../../components/rating'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { RangeSlider, Slider } from '../../../components/slider'
import { Switch, SwitchField } from '../../../components/switch'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const SIZES = ['sm', 'md', 'lg'] as const

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia']

const LONG_OPTION =
	'An option label that is long enough to fill the trigger and to test how it clips'

const PEOPLE = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb', 'Tom Cook']

const PLANS = ['Starter', 'Business', 'Enterprise'] as const

const display = (value: string) => value

function CountryOptions() {
	return [...COUNTRIES, LONG_OPTION].map((country) => (
		<SelectOption key={country} value={country}>
			<SelectLabel>{country}</SelectLabel>
		</SelectOption>
	))
}

function PeopleOptions() {
	return [...PEOPLE, LONG_OPTION].map((person) => (
		<ComboboxOption key={person} value={person}>
			<ComboboxLabel>{person}</ComboboxLabel>
		</ComboboxOption>
	))
}

function StatusOptions() {
	return ['Active', 'Paused', 'Delayed', LONG_OPTION].map((status) => (
		<ListboxOption key={status} value={status}>
			<ListboxLabel>{status}</ListboxLabel>
		</ListboxOption>
	))
}

export function Sheet() {
	return (
		<FixtureSheet title="Choice inputs">
			<FixtureGroup title="Select">
				<FixtureCase label="default">
					<Select aria-label="Default" placeholder="Select a country" displayValue={display}>
						<CountryOptions />
					</Select>
				</FixtureCase>
				<FixtureCase label="with value">
					<Select aria-label="With value" defaultValue="Canada" displayValue={display}>
						<CountryOptions />
					</Select>
				</FixtureCase>
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Select
							key={size}
							aria-label={size}
							size={size}
							defaultValue="Canada"
							displayValue={display}
						>
							<CountryOptions />
						</Select>
					))}
				</FixtureCase>
				<FixtureCase label="disabled">
					<Select aria-label="Disabled" disabled defaultValue="Canada" displayValue={display}>
						<CountryOptions />
					</Select>
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Country</Label>
						<Select placeholder="Select a country" displayValue={display}>
							<CountryOptions />
						</Select>
						<Message severity="error">Select a country</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<Select
						aria-label="Long value"
						className="w-full"
						defaultValue={LONG_OPTION}
						displayValue={display}
					>
						<CountryOptions />
					</Select>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Combobox">
				<FixtureCase label="default">
					<Combobox aria-label="Default" placeholder="Select a person" displayValue={display}>
						<PeopleOptions />
					</Combobox>
				</FixtureCase>
				<FixtureCase label="with value">
					<Combobox aria-label="With value" defaultValue="Devon Webb" displayValue={display}>
						<PeopleOptions />
					</Combobox>
				</FixtureCase>
				<FixtureCase label="disabled">
					<Combobox aria-label="Disabled" disabled defaultValue="Tom Cook" displayValue={display}>
						<PeopleOptions />
					</Combobox>
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Assignee</Label>
						<Combobox placeholder="Select a person" displayValue={display}>
							<PeopleOptions />
						</Combobox>
						<Message severity="error">Select an assignee</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<Combobox
						aria-label="Long value"
						className="w-full"
						defaultValue={LONG_OPTION}
						displayValue={display}
					>
						<PeopleOptions />
					</Combobox>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Listbox">
				<FixtureCase label="default">
					<Listbox aria-label="Default" placeholder="Select status" displayValue={display}>
						<StatusOptions />
					</Listbox>
				</FixtureCase>
				<FixtureCase label="with value">
					<Listbox aria-label="With value" defaultValue="Paused" displayValue={display}>
						<StatusOptions />
					</Listbox>
				</FixtureCase>
				<FixtureCase label="multiple">
					<Listbox
						aria-label="Multiple"
						multiple
						defaultValue={['Active', 'Delayed']}
						displayValue={display}
					>
						<StatusOptions />
					</Listbox>
				</FixtureCase>
				<FixtureCase label="disabled">
					<Listbox aria-label="Disabled" disabled defaultValue="Active" displayValue={display}>
						<StatusOptions />
					</Listbox>
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Status</Label>
						<Listbox placeholder="Select status" displayValue={display}>
							<StatusOptions />
						</Listbox>
						<Message severity="error">Select a status</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<Listbox
						aria-label="Long value"
						className="w-full"
						defaultValue={LONG_OPTION}
						displayValue={display}
					>
						<StatusOptions />
					</Listbox>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Checkbox">
				<FixtureCase label="states">
					<CheckboxGroup aria-label="States">
						<CheckboxField>
							<Checkbox />
							<Label>Unchecked</Label>
						</CheckboxField>
						<CheckboxField>
							<Checkbox defaultChecked />
							<Label>Checked</Label>
						</CheckboxField>
						<CheckboxField>
							<Checkbox indeterminate />
							<Label>Indeterminate</Label>
						</CheckboxField>
					</CheckboxGroup>
				</FixtureCase>
				<FixtureCase label="disabled">
					<CheckboxGroup aria-label="Disabled">
						<CheckboxField>
							<Checkbox disabled />
							<Label>Disabled</Label>
						</CheckboxField>
						<CheckboxField>
							<Checkbox disabled defaultChecked />
							<Label>Disabled, checked</Label>
						</CheckboxField>
					</CheckboxGroup>
				</FixtureCase>
				<FixtureCase label="invalid">
					<Control severity="error">
						<CheckboxField>
							<Checkbox />
							<Label>Accept the terms</Label>
						</CheckboxField>
						<Message severity="error">Accept the terms to continue</Message>
					</Control>
				</FixtureCase>
				<FixtureCase label="color">
					{COLORS.map((color) => (
						<Checkbox key={color} aria-label={color} color={color} defaultChecked />
					))}
				</FixtureCase>
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Checkbox key={size} aria-label={size} size={size} defaultChecked />
					))}
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<CheckboxField>
						<Checkbox defaultChecked />
						<Label>
							A checkbox label that is long enough to wrap onto a second line in a narrow container
						</Label>
						<Description>
							A description that is also long, so that the text wraps below the label at the narrow
							width of the sheet.
						</Description>
					</CheckboxField>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Radio">
				<FixtureCase label="group">
					<RadioGroup aria-label="Plan">
						{PLANS.map((plan) => (
							<RadioField key={plan}>
								<Radio name="fixture-plan" value={plan} defaultChecked={plan === 'Business'} />
								<Label>{plan}</Label>
							</RadioField>
						))}
					</RadioGroup>
				</FixtureCase>
				<FixtureCase label="disabled">
					<RadioGroup aria-label="Disabled">
						<RadioField>
							<Radio name="fixture-disabled" value="off" disabled />
							<Label>Disabled</Label>
						</RadioField>
						<RadioField>
							<Radio name="fixture-disabled" value="on" disabled defaultChecked />
							<Label>Disabled, checked</Label>
						</RadioField>
					</RadioGroup>
				</FixtureCase>
				<FixtureCase label="invalid">
					<Control severity="error">
						<RadioField>
							<Radio name="fixture-invalid" value="yes" />
							<Label>Choose an option</Label>
						</RadioField>
						<Message severity="error">Choose one plan</Message>
					</Control>
				</FixtureCase>
				<FixtureCase label="color">
					{COLORS.map((color) => (
						<Radio
							key={color}
							name={`fixture-color-${color}`}
							aria-label={color}
							color={color}
							defaultChecked
						/>
					))}
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<RadioGroup aria-label="Long label">
						<RadioField>
							<Radio name="fixture-long" value="long" defaultChecked />
							<Label>
								A radio label that is long enough to wrap onto a second line in a narrow container
							</Label>
							<Description>
								A description that is also long, so that the text wraps below the label at the
								narrow width of the sheet.
							</Description>
						</RadioField>
					</RadioGroup>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Switch">
				<FixtureCase label="states">
					<SwitchField>
						<Label>Off</Label>
						<Switch />
					</SwitchField>
					<SwitchField>
						<Label>On</Label>
						<Switch defaultChecked />
					</SwitchField>
				</FixtureCase>
				<FixtureCase label="disabled">
					<SwitchField>
						<Label>Disabled</Label>
						<Switch disabled />
					</SwitchField>
					<SwitchField>
						<Label>Disabled, on</Label>
						<Switch disabled defaultChecked />
					</SwitchField>
				</FixtureCase>
				<FixtureCase label="invalid">
					<Control severity="error">
						<SwitchField>
							<Label>Notifications</Label>
							<Switch />
							<Message severity="error">Turn on notifications to continue</Message>
						</SwitchField>
					</Control>
				</FixtureCase>
				<FixtureCase label="color">
					{COLORS.map((color) => (
						<Switch key={color} aria-label={color} color={color} defaultChecked />
					))}
				</FixtureCase>
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Switch key={size} aria-label={size} size={size} defaultChecked />
					))}
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<SwitchField className="w-full">
						<Label>
							A switch label that is long enough to wrap onto a second line in a narrow container
						</Label>
						<Description>
							A description that is also long, so that the text wraps below the label at the narrow
							width of the sheet.
						</Description>
						<Switch defaultChecked />
					</SwitchField>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Slider">
				<FixtureCase label="default">
					<Slider aria-label="Default" className="w-full" />
				</FixtureCase>
				<FixtureCase label="value">
					<Slider aria-label="Value" className="w-full" defaultValue={70} />
				</FixtureCase>
				<FixtureCase label="range">
					<RangeSlider aria-label="Range" className="w-full" defaultValue={[25, 75]} />
				</FixtureCase>
				<FixtureCase label="color">
					{COLORS.map((color) => (
						<Slider
							key={color}
							aria-label={color}
							className="w-full"
							color={color}
							defaultValue={60}
						/>
					))}
				</FixtureCase>
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Slider key={size} aria-label={size} className="w-full" size={size} defaultValue={40} />
					))}
				</FixtureCase>
				<FixtureCase label="disabled">
					<Slider aria-label="Disabled" className="w-full" disabled defaultValue={50} />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Volume</Label>
						<Slider defaultValue={95} />
						<Message severity="error">Keep the volume below 80</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="full width" wide>
					<Slider aria-label="Full width" className="w-full" defaultValue={33} />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Rating">
				<FixtureCase label="default">
					<Rating aria-label="Default" />
				</FixtureCase>
				<FixtureCase label="value">
					<Rating aria-label="Value" defaultValue={3} />
				</FixtureCase>
				<FixtureCase label="read-only, fraction">
					<Rating aria-label="Read-only" readOnly value={4.2} />
				</FixtureCase>
				<FixtureCase label="color">
					{COLORS.map((color) => (
						<Rating key={color} aria-label={color} color={color} defaultValue={4} />
					))}
				</FixtureCase>
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Rating key={size} aria-label={size} size={size} defaultValue={2} />
					))}
				</FixtureCase>
				<FixtureCase label="count">
					<Rating aria-label="Out of ten" count={10} defaultValue={7} />
				</FixtureCase>
				<FixtureCase label="disabled">
					<Rating aria-label="Disabled" disabled defaultValue={3} />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label as="span">Score</Label>
						<Rating />
						<Message severity="error">Rate the order</Message>
					</Field>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Segment">
				<FixtureCase label="default">
					<Segment defaultValue="List">
						<SegmentControl aria-label="View">
							<SegmentItem value="List">List</SegmentItem>
							<SegmentItem value="Card">Card</SegmentItem>
						</SegmentControl>
					</Segment>
				</FixtureCase>
				<FixtureCase label="disabled item">
					<Segment defaultValue="List">
						<SegmentControl aria-label="View">
							<SegmentItem value="List">List</SegmentItem>
							<SegmentItem value="Grid">Grid</SegmentItem>
							<SegmentItem value="Map" disabled>
								Map
							</SegmentItem>
						</SegmentControl>
					</Segment>
				</FixtureCase>
				<FixtureCase label="long labels, full width" wide>
					<Segment defaultValue="Archived" className="w-full">
						<SegmentControl aria-label="Filter">
							<SegmentItem value="All">All</SegmentItem>
							<SegmentItem value="Active">Scheduled</SegmentItem>
							<SegmentItem value="Archived">Archived campaigns</SegmentItem>
						</SegmentControl>
					</Segment>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Color">
				<FixtureCase label="picker">
					<ColorPicker aria-label="Color" defaultValue="#8b5cf6" />
				</FixtureCase>
				<FixtureCase label="picker, disabled">
					<ColorPicker aria-label="Disabled color" disabled defaultValue="#f97316" />
				</FixtureCase>
				<FixtureCase label="panel">
					<ColorPanel defaultValue="#3b82f6" />
				</FixtureCase>
				<FixtureCase label="panel, alpha">
					<ColorPanel alpha defaultValue="#22c55e80" />
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
