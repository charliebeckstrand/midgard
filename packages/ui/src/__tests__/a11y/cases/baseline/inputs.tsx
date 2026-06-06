import { Calendar } from '../../../../components/calendar'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../../../components/checkbox'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../../components/combobox'
import { DatePicker } from '../../../../components/date-picker'
import { Field, Label } from '../../../../components/fieldset'
import { FileUpload } from '../../../../components/file-upload'
import { Input } from '../../../../components/input'
import { Radio, RadioField, RadioGroup } from '../../../../components/radio'
import { Select, SelectLabel, SelectOption } from '../../../../components/select'
import { Slider } from '../../../../components/slider'
import { Switch, SwitchField } from '../../../../components/switch'
import { TagInput } from '../../../../components/tag-input'
import { Textarea } from '../../../../components/textarea'
import { ToggleIconButton } from '../../../../components/toggle-icon-button'
import type { Case } from '../types'

/** Inputs & form fields, each in its canonical labelled form. */
export const inputCases: readonly Case[] = [
	[
		'input in field',
		<Field key="f">
			<Label htmlFor="axe-name">Name</Label>
			<Input id="axe-name" />
		</Field>,
	],
	[
		'textarea in field',
		<Field key="f">
			<Label htmlFor="axe-bio">Bio</Label>
			<Textarea id="axe-bio" />
		</Field>,
	],
	[
		// No explicit id: the Field generates one, the Label and Slider both read
		// it from Control context, so the label names the range input.
		'slider in field',
		<Field key="f">
			<Label>Volume</Label>
			<Slider defaultValue={50} />
		</Field>,
	],
	['file upload (area)', <FileUpload key="fu" variant="area" />],
	['file upload (button)', <FileUpload key="fu" variant="button" />],
	[
		'checkbox',
		<CheckboxGroup key="c">
			<CheckboxField>
				<Checkbox />
				<Label>Accept terms and conditions</Label>
			</CheckboxField>
		</CheckboxGroup>,
	],
	[
		'switch',
		<SwitchField key="s">
			<Label>Notifications</Label>
			<Switch />
		</SwitchField>,
	],
	[
		// Radios share a name to form a single group; each input is named by its
		// adjacent Label through Control context.
		'radio',
		<RadioGroup key="r">
			<RadioField>
				<Radio name="plan" value="starter" defaultChecked />
				<Label>Starter</Label>
			</RadioField>
			<RadioField>
				<Radio name="plan" value="business" />
				<Label>Business</Label>
			</RadioField>
		</RadioGroup>,
	],
	[
		// Icon-only toggle: aria-pressed reflects state, aria-label supplies the
		// accessible name the icon cannot.
		'toggle icon button',
		<ToggleIconButton
			key="tib"
			pressed={false}
			icon={<svg aria-hidden="true" />}
			pressedIcon={<svg aria-hidden="true" />}
			aria-label="Toggle dark mode"
		/>,
	],
	[
		// Tags edited inline; the composite is named by its Field Label through
		// Control context.
		'tag input',
		<Field key="ti">
			<Label>Tags</Label>
			<TagInput defaultValue={['React', 'TypeScript']} placeholder="Add a tag" />
		</Field>,
	],
	['calendar', <Calendar key="ca" />],
	[
		// Closed select: the trigger is a button named by its Field Label; the
		// option popover only mounts when opened (covered in the overlays corpus).
		'select in field',
		<Field key="sl">
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
	],
	[
		// Closed date picker: the trigger is named by its Field Label; the calendar
		// popover only mounts when opened.
		'date picker in field',
		<Field key="dp">
			<Label>Start date</Label>
			<DatePicker />
		</Field>,
	],
	[
		// Closed combobox: role=combobox input named by its Field Label, aria-expanded
		// false; the option listbox only mounts when opened (open form lives in the
		// interactive corpus).
		'combobox in field',
		<Field key="cb">
			<Label>Assignee</Label>
			<Combobox displayValue={(value: string) => value} placeholder="Select a person">
				{() => (
					<ComboboxOption value="Wade Cooper">
						<ComboboxLabel>Wade Cooper</ComboboxLabel>
					</ComboboxOption>
				)}
			</Combobox>
		</Field>,
	],
]
