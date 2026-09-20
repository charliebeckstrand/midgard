import { AddressInput, type AddressProvider } from '../../../components/address-input'
import { Calendar, CalendarSkeleton } from '../../../components/calendar'
import {
	Checkbox,
	CheckboxField,
	CheckboxGroup,
	CheckboxSkeleton,
} from '../../../components/checkbox'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { CreditCardInput } from '../../../components/credit-card-input'
import { CurrencyInput } from '../../../components/currency-input'
import { DateInput } from '../../../components/date-input'
import { DatePicker } from '../../../components/date-picker'
import { Field, Label, Message } from '../../../components/fieldset'
import { FileUploadButton, FileUploadDrop } from '../../../components/file-upload'
import { Input } from '../../../components/input'
import { MaskInput } from '../../../components/mask-input'
import { NumberInput } from '../../../components/number-input'
import { PasswordConfirm, PasswordConfirmInput } from '../../../components/password-confirm'
import { PasswordInput } from '../../../components/password-input'
import { PasswordStrength } from '../../../components/password-strength'
import { PhoneInput } from '../../../components/phone-input'
import { Radio, RadioField, RadioGroup, RadioSkeleton } from '../../../components/radio'
import { Rating, RatingSkeleton } from '../../../components/rating'
import { SearchInput } from '../../../components/search-input'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { SignaturePad } from '../../../components/signature-pad'
import { Slider, SliderSkeleton } from '../../../components/slider'
import { Switch, SwitchField, SwitchSkeleton } from '../../../components/switch'
import { TagInput } from '../../../components/tag-input'
import { Textarea, TextareaSkeleton } from '../../../components/textarea'
import { ToggleIconButton, ToggleIconButtonSkeleton } from '../../../components/toggle-icon-button'
import { ZipcodeInput } from '../../../components/zipcode-input'
import type { Case } from './types'

// A license-plate mask: uppercase, alphanumeric, grouped 3-4 (mirrors the demo).
function formatLicensePlate(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 7)

	return clean.length <= 3 ? clean : `${clean.slice(0, 3)}-${clean.slice(3)}`
}

// Static suggestion provider: the closed AddressInput never hits the network.
const addressProvider: AddressProvider = async () => []

/** Inputs & form fields, each in its canonical labelled form. */
export const inputCases: readonly Case[] = [
	{
		name: 'input in field',
		element: (
			<Field key="f">
				<Label htmlFor="axe-name">Name</Label>
				<Input id="axe-name" />
			</Field>
		),
	},
	{
		name: 'input in field (warning)',
		element: (
			<Field key="f" severity="warning">
				<Label htmlFor="axe-warn">Warning</Label>
				<Input id="axe-warn" />
				<Message severity="warning">Double-check this value</Message>
			</Field>
		),
	},
	{
		name: 'input in field (success)',
		element: (
			<Field key="f" severity="success">
				<Label htmlFor="axe-ok">Success</Label>
				<Input id="axe-ok" />
				<Message severity="success">Looks good</Message>
			</Field>
		),
	},
	{
		name: 'textarea in field',
		element: (
			<Field key="f">
				<Label htmlFor="axe-bio">Bio</Label>
				<Textarea id="axe-bio" />
			</Field>
		),
		skeleton: [{ element: <TextareaSkeleton />, absentSlot: 'textarea' }],
	},
	{
		// No explicit id: the Field generates one and both Label and Slider read
		// it from Control context; the label names the range input.
		name: 'slider in field',
		element: (
			<Field key="f">
				<Label>Volume</Label>
				<Slider defaultValue={50} />
			</Field>
		),
		passthrough: [{ render: (props) => <Slider {...props} />, slot: 'slider' }],
		skeleton: [{ element: <SliderSkeleton />, absentSlot: 'slider' }],
	},
	{
		// The Field's Label names the radiogroup through Control context, so the
		// row carries no `aria-label` of its own here.
		name: 'rating in field',
		element: (
			<Field key="f">
				<Label>How was it?</Label>
				<Rating defaultValue={4} />
			</Field>
		),
	},
	{
		name: 'rating (read-only)',
		element: <Rating key="r" readOnly value={4.5} />,
		skeleton: [{ element: <RatingSkeleton />, absentSlot: 'rating', placeholders: 5 }],
	},
	{ name: 'file upload (drop)', element: <FileUploadDrop key="fu" /> },
	{ name: 'file upload (button)', element: <FileUploadButton key="fub" /> },
	{
		name: 'checkbox',
		element: (
			<CheckboxGroup key="c">
				<CheckboxField>
					<Checkbox />
					<Label>Accept terms and conditions</Label>
				</CheckboxField>
			</CheckboxGroup>
		),
		skeleton: [{ element: <CheckboxSkeleton />, absentSlot: 'checkbox' }],
	},
	{
		name: 'switch',
		element: (
			<SwitchField key="s">
				<Label>Notifications</Label>
				<Switch />
			</SwitchField>
		),
		skeleton: [{ element: <SwitchSkeleton />, absentSlot: 'switch' }],
	},
	{
		// Radios share a name to form a single group; each input is named by its
		// adjacent Label through Control context.
		name: 'radio',
		element: (
			<RadioGroup key="r" aria-label="Plan">
				<RadioField>
					<Radio name="plan" value="starter" defaultChecked />
					<Label>Starter</Label>
				</RadioField>
				<RadioField>
					<Radio name="plan" value="business" />
					<Label>Business</Label>
				</RadioField>
			</RadioGroup>
		),
		skeleton: [{ element: <RadioSkeleton />, absentSlot: 'radio' }],
	},
	{
		// Icon-only toggle: aria-pressed reflects state, aria-label supplies the
		// accessible name the icon cannot.
		name: 'toggle icon button',
		element: (
			<ToggleIconButton
				key="tib"
				pressed={false}
				icon={<svg aria-hidden="true" />}
				pressedIcon={<svg aria-hidden="true" />}
				aria-label="Toggle dark mode"
			/>
		),
		skeleton: [{ element: <ToggleIconButtonSkeleton />, absentSlot: 'toggle-icon-button' }],
	},
	{
		// Tags edited inline; the composite is named by its Field Label through
		// Control context.
		name: 'tag input',
		element: (
			<Field key="ti">
				<Label>Tags</Label>
				<TagInput defaultValue={['React', 'TypeScript']} placeholder="Add a tag" />
			</Field>
		),
	},
	{
		name: 'calendar',
		element: <Calendar key="ca" />,
		skeleton: [{ element: <CalendarSkeleton />, absentSlot: 'calendar' }],
	},
	{
		// Closed select: the trigger is a button named by its Field Label; the
		// option popover only mounts when opened (covered in the overlays corpus).
		name: 'select in field',
		element: (
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
			</Field>
		),
	},
	{
		// Closed date picker: the trigger is named by its Field Label; the calendar
		// popover only mounts when opened.
		name: 'date picker in field',
		element: (
			<Field key="dp">
				<Label>Start date</Label>
				<DatePicker />
			</Field>
		),
	},
	{
		// Bare masked date entry: self-labels with a default aria-label="Date" and
		// advertises numeric input mode; the calendar suffix icon is decorative.
		name: 'date input',
		element: <DateInput key="di" />,
	},
	{
		// Same masked input wired to a Field: the Label names it and the default
		// aria-label steps aside.
		name: 'date input in field',
		element: (
			<Field key="dif">
				<Label>Due date</Label>
				<DateInput />
			</Field>
		),
	},
	{
		// Closed combobox: role=combobox input named by its Field Label, aria-expanded
		// false; the option listbox only mounts when opened (open form lives in the
		// interactive corpus).
		name: 'combobox in field',
		element: (
			<Field key="cb">
				<Label>Assignee</Label>
				<Combobox displayValue={(value: string) => value} placeholder="Select a person">
					<ComboboxOption value="Wade Cooper">
						<ComboboxLabel>Wade Cooper</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			</Field>
		),
	},
	{
		name: 'number input',
		element: (
			<Field key="num">
				<Label>Quantity</Label>
				<NumberInput defaultValue={1} min={0} max={10} />
			</Field>
		),
	},
	{
		name: 'currency input',
		element: (
			<Field key="cur">
				<Label>Amount</Label>
				<CurrencyInput defaultValue={1234.56} />
			</Field>
		),
	},
	{
		name: 'credit card input',
		element: (
			<Field key="cc">
				<Label>Card number</Label>
				<CreditCardInput placeholder="0000 0000 0000 0000" />
			</Field>
		),
	},
	{
		name: 'phone input',
		element: (
			<Field key="ph">
				<Label>Phone</Label>
				<PhoneInput placeholder="(555) 555-5555" />
			</Field>
		),
	},
	{
		name: 'zipcode input',
		element: (
			<Field key="zip">
				<Label>ZIP</Label>
				<ZipcodeInput country="US" />
			</Field>
		),
	},
	{
		name: 'mask input',
		element: (
			<Field key="mask">
				<Label>License plate</Label>
				<MaskInput format={formatLicensePlate} placeholder="ABC-1234" />
			</Field>
		),
	},
	{
		name: 'search input',
		element: (
			<Field key="search">
				<Label>Search</Label>
				<SearchInput placeholder="Search" />
			</Field>
		),
	},
	{
		name: 'password input',
		element: (
			<Field key="pw">
				<Label>Password</Label>
				<PasswordInput placeholder="Enter password" autoComplete="new-password" />
			</Field>
		),
	},
	{
		// Two coupled fields under a wrapper that flags mismatch; each input is
		// named by its own Label.
		name: 'password confirm',
		element: (
			<PasswordConfirm key="pwc" warning="Passwords do not match">
				<Field>
					<Label>Password</Label>
					<PasswordInput placeholder="Enter password" autoComplete="new-password" />
				</Field>
				<Field>
					<Label>Confirm password</Label>
					<PasswordConfirmInput placeholder="Confirm password" autoComplete="new-password" />
				</Field>
			</PasswordConfirm>
		),
	},
	{
		// Strength meter driven by a value; carries its own atomic live region.
		name: 'password strength',
		element: <PasswordStrength key="pws" value="Sup3rSecret!" />,
	},
	{
		// Canvas capture: role="img" plus an aria-label make the surface
		// perceivable and reflect its empty/filled state.
		name: 'signature pad',
		element: <SignaturePad key="sig" aria-label="Signature" />,
	},
	{
		// Closed address autocomplete: combobox input named by its Field Label; the
		// suggestion popover only mounts once a query is typed.
		name: 'address input',
		element: (
			<Field key="addr">
				<Label>Address</Label>
				<AddressInput provider={addressProvider} placeholder="Search address" />
			</Field>
		),
	},
]
