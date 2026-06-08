import { AddressInput, type AddressProvider } from '../../../components/address-input'
import { Calendar } from '../../../components/calendar'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../../components/checkbox'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { CreditCardInput } from '../../../components/credit-card-input'
import { CurrencyInput } from '../../../components/currency-input'
import { DatePicker } from '../../../components/date-picker'
import { Field, Label } from '../../../components/fieldset'
import { FileUpload } from '../../../components/file-upload'
import { Input } from '../../../components/input'
import { MaskInput } from '../../../components/mask-input'
import { NumberInput } from '../../../components/number-input'
import { PasswordConfirm, PasswordConfirmInput } from '../../../components/password-confirm'
import { PasswordInput } from '../../../components/password-input'
import { PasswordStrength } from '../../../components/password-strength'
import { PhoneInput } from '../../../components/phone-input'
import { Radio, RadioField, RadioGroup } from '../../../components/radio'
import { SearchInput } from '../../../components/search-input'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { SignaturePad } from '../../../components/signature-pad'
import { Slider } from '../../../components/slider'
import { Switch, SwitchField } from '../../../components/switch'
import { TagInput } from '../../../components/tag-input'
import { Textarea } from '../../../components/textarea'
import { ToggleIconButton } from '../../../components/toggle-icon-button'
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
		// No explicit id: the Field generates one and both Label and Slider read
		// it from Control context — the label names the range input.
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
		<RadioGroup key="r" aria-label="Plan">
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
	[
		'number input',
		<Field key="num">
			<Label>Quantity</Label>
			<NumberInput defaultValue={1} min={0} max={10} />
		</Field>,
	],
	[
		'currency input',
		<Field key="cur">
			<Label>Amount</Label>
			<CurrencyInput defaultValue={1234.56} />
		</Field>,
	],
	[
		'credit card input',
		<Field key="cc">
			<Label>Card number</Label>
			<CreditCardInput placeholder="0000 0000 0000 0000" />
		</Field>,
	],
	[
		'phone input',
		<Field key="ph">
			<Label>Phone</Label>
			<PhoneInput placeholder="(555) 555-5555" />
		</Field>,
	],
	[
		'zipcode input',
		<Field key="zip">
			<Label>ZIP</Label>
			<ZipcodeInput country="US" />
		</Field>,
	],
	[
		'mask input',
		<Field key="mask">
			<Label>License plate</Label>
			<MaskInput format={formatLicensePlate} placeholder="ABC-1234" />
		</Field>,
	],
	[
		'search input',
		<Field key="search">
			<Label>Search</Label>
			<SearchInput placeholder="Search" />
		</Field>,
	],
	[
		'password input',
		<Field key="pw">
			<Label>Password</Label>
			<PasswordInput placeholder="Enter password" autoComplete="new-password" />
		</Field>,
	],
	[
		// Two coupled fields under a wrapper that flags mismatch; each input is
		// named by its own Label.
		'password confirm',
		<PasswordConfirm key="pwc" warning="Passwords do not match">
			<Field>
				<Label>Password</Label>
				<PasswordInput placeholder="Enter password" autoComplete="new-password" />
			</Field>
			<Field>
				<Label>Confirm password</Label>
				<PasswordConfirmInput placeholder="Confirm password" autoComplete="new-password" />
			</Field>
		</PasswordConfirm>,
	],
	[
		// Strength meter driven by a value; carries its own atomic live region.
		'password strength',
		<PasswordStrength key="pws" value="Sup3rSecret!" />,
	],
	[
		// Canvas capture: role="img" plus an aria-label make the surface
		// perceivable and reflect its empty/filled state.
		'signature pad',
		<SignaturePad key="sig" aria-label="Signature" />,
	],
	[
		// Closed address autocomplete: combobox input named by its Field Label; the
		// suggestion popover only mounts once a query is typed.
		'address input',
		<Field key="addr">
			<Label>Address</Label>
			<AddressInput provider={addressProvider} placeholder="Search address" />
		</Field>,
	],
]
