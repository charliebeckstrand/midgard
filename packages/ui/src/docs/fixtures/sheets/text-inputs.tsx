import { Search } from 'lucide-react'
import {
	AddressInput,
	type AddressProvider,
	type AddressSuggestion,
} from '../../../components/address-input'
import {
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
} from '../../../components/credit-card-input'
import { CurrencyInput } from '../../../components/currency-input'
import { Description, Field, Label, Message } from '../../../components/fieldset'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { MaskInput, phoneMask, zipcodeMask } from '../../../components/mask-input'
import { NumberInput } from '../../../components/number-input'
import { PasswordInput } from '../../../components/password-input'
import { SearchInput } from '../../../components/search-input'
import { TagInput } from '../../../components/tag-input'
import { Textarea } from '../../../components/textarea'
import { FixtureCase, FixtureGroup, FixtureSheet } from '../fixture'

const SIZES = ['sm', 'md', 'lg'] as const

const VARIANTS = ['default', 'outline'] as const

const LONG_VALUE =
	'A value that is long enough to fill the field and to test how the control clips its text'

const HOME: AddressSuggestion = {
	id: 'home',
	label: '221B Baker Street',
	description: 'London, UK',
}

const LONG_ADDRESS: AddressSuggestion = {
	id: 'long',
	label: '1600 Amphitheatre Parkway, Building 40, Floor 2, Suite 200',
	description: 'Mountain View, California 94043, United States of America',
}

// A fixed provider, so that the sheet never calls the network.
const provider: AddressProvider = async () => [HOME, LONG_ADDRESS]

export function Sheet() {
	return (
		<FixtureSheet title="Text inputs">
			<FixtureGroup title="Input">
				<FixtureCase label="default">
					<Input aria-label="Default" placeholder="Placeholder" />
				</FixtureCase>
				<FixtureCase label="filled">
					<Input aria-label="Filled" defaultValue="Jane Smith" />
				</FixtureCase>
				<FixtureCase label="prefix">
					<Input aria-label="Prefix" prefix={<Icon icon={<Search />} />} placeholder="Search" />
				</FixtureCase>
				{VARIANTS.map((variant) => (
					<FixtureCase key={variant} label={`variant ${variant}`}>
						<Input aria-label={variant} variant={variant} defaultValue={variant} />
					</FixtureCase>
				))}
				<FixtureCase label="size">
					{SIZES.map((size) => (
						<Input key={size} aria-label={size} size={size} defaultValue={size} />
					))}
				</FixtureCase>
				<FixtureCase label="disabled">
					<Input aria-label="Disabled" disabled defaultValue="Disabled" />
				</FixtureCase>
				<FixtureCase label="read-only">
					<Input aria-label="Read-only" readOnly defaultValue="Read-only" />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Input aria-label="Invalid" invalid defaultValue="Invalid" />
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<Input aria-label="Long value" className="w-full" defaultValue={LONG_VALUE} />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Textarea">
				<FixtureCase label="default">
					<Textarea aria-label="Default" placeholder="Placeholder" />
				</FixtureCase>
				<FixtureCase label="filled">
					<Textarea aria-label="Filled" defaultValue={'First line\nSecond line'} />
				</FixtureCase>
				<FixtureCase label="variant outline">
					<Textarea aria-label="Outline" variant="outline" defaultValue="Outline" />
				</FixtureCase>
				<FixtureCase label="disabled">
					<Textarea aria-label="Disabled" disabled defaultValue="Disabled" />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Textarea aria-label="Invalid" invalid defaultValue="Invalid" />
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<Textarea
						aria-label="Long value"
						className="w-full"
						rows={2}
						defaultValue={`${LONG_VALUE}. ${LONG_VALUE}. ${LONG_VALUE}.`}
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Number input">
				<FixtureCase label="default">
					<NumberInput aria-label="Default" placeholder="0" />
				</FixtureCase>
				<FixtureCase label="filled">
					<NumberInput aria-label="Filled" defaultValue={3} min={0} max={10} />
				</FixtureCase>
				<FixtureCase label="disabled">
					<NumberInput aria-label="Disabled" disabled defaultValue={1} />
				</FixtureCase>
				<FixtureCase label="invalid">
					<NumberInput aria-label="Invalid" invalid defaultValue={42} />
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<NumberInput aria-label="Long value" className="w-full" defaultValue={1234567890123} />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Currency input">
				<FixtureCase label="default">
					<CurrencyInput aria-label="Default" />
				</FixtureCase>
				<FixtureCase label="USD">
					<CurrencyInput aria-label="USD" locale="en-US" defaultValue={1234.56} />
				</FixtureCase>
				<FixtureCase label="EUR">
					<CurrencyInput aria-label="EUR" currency="EUR" locale="en-IE" defaultValue={2499} />
				</FixtureCase>
				<FixtureCase label="JPY">
					<CurrencyInput aria-label="JPY" currency="JPY" locale="ja-JP" defaultValue={9800} />
				</FixtureCase>
				<FixtureCase label="disabled">
					<CurrencyInput aria-label="Disabled" locale="en-US" disabled defaultValue={500} />
				</FixtureCase>
				<FixtureCase label="invalid">
					<CurrencyInput aria-label="Invalid" locale="en-US" invalid defaultValue={-12} />
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<CurrencyInput
						aria-label="Long value"
						locale="en-US"
						className="w-full"
						defaultValue={987654321012.34}
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Credit card input">
				<FixtureCase label="default">
					<CreditCardInput aria-label="Default" />
				</FixtureCase>
				<FixtureCase label="Visa">
					<CreditCardInput aria-label="Visa" defaultValue="4242424242424242" />
				</FixtureCase>
				<FixtureCase label="Amex">
					<CreditCardInput aria-label="Amex" defaultValue="378282246310005" />
				</FixtureCase>
				<FixtureCase label="Mastercard">
					<CreditCardInput aria-label="Mastercard" defaultValue="5555555555554444" />
				</FixtureCase>
				<FixtureCase label="expiry and CVV">
					<CreditCardInputExpiry aria-label="Expiry" defaultValue="1230" />
					<CreditCardInputCvv aria-label="CVV" defaultValue="123" />
				</FixtureCase>
				<FixtureCase label="disabled">
					<CreditCardInput aria-label="Disabled" disabled defaultValue="4242424242424242" />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Card number</Label>
						<CreditCardInput defaultValue="4242424242424241" />
						<Message severity="error">Enter a valid card number</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="full width" wide>
					<CreditCardInput
						aria-label="Full width"
						className="w-full"
						defaultValue="4242424242424242"
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Mask input">
				<FixtureCase label="phone">
					<MaskInput aria-label="Phone" mask={phoneMask()} placeholder="(555) 555-5555" />
				</FixtureCase>
				<FixtureCase label="phone, filled">
					<MaskInput aria-label="Phone filled" mask={phoneMask()} defaultValue="4155551234" />
				</FixtureCase>
				<FixtureCase label="phone, international">
					<MaskInput
						aria-label="International phone"
						mask={phoneMask('international')}
						defaultValue="+442071234567"
					/>
				</FixtureCase>
				<FixtureCase label="ZIP">
					<MaskInput aria-label="ZIP" mask={zipcodeMask()} defaultValue="941031234" />
				</FixtureCase>
				<FixtureCase label="postal code, CA">
					<MaskInput
						aria-label="Canadian postal code"
						mask={zipcodeMask('CA')}
						defaultValue="k1a0b1"
					/>
				</FixtureCase>
				<FixtureCase label="postcode, GB">
					<MaskInput aria-label="UK postcode" mask={zipcodeMask('GB')} defaultValue="sw1a2aa" />
				</FixtureCase>
				<FixtureCase label="disabled">
					<MaskInput aria-label="Disabled" disabled mask={phoneMask()} defaultValue="4155551234" />
				</FixtureCase>
				<FixtureCase label="invalid">
					<MaskInput aria-label="Invalid" invalid mask={zipcodeMask()} defaultValue="941" />
				</FixtureCase>
				<FixtureCase label="full width" wide>
					<MaskInput
						aria-label="Full width"
						className="w-full"
						mask={phoneMask()}
						defaultValue="4155551234"
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Password input">
				<FixtureCase label="default">
					<PasswordInput aria-label="Default" placeholder="Enter password" />
				</FixtureCase>
				<FixtureCase label="filled">
					<PasswordInput aria-label="Filled" defaultValue="hunter2" />
				</FixtureCase>
				<FixtureCase label="disabled">
					<PasswordInput aria-label="Disabled" disabled defaultValue="hunter2" />
				</FixtureCase>
				<FixtureCase label="invalid">
					<PasswordInput aria-label="Invalid" invalid defaultValue="short" />
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<PasswordInput aria-label="Long value" className="w-full" defaultValue={LONG_VALUE} />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Search input">
				<FixtureCase label="default">
					<SearchInput aria-label="Default" placeholder="Search" />
				</FixtureCase>
				<FixtureCase label="filled">
					<SearchInput aria-label="Filled" defaultValue="Invoices" />
				</FixtureCase>
				<FixtureCase label="disabled">
					<SearchInput aria-label="Disabled" disabled placeholder="Search" />
				</FixtureCase>
				<FixtureCase label="invalid">
					<SearchInput aria-label="Invalid" invalid defaultValue="Invoices" />
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<SearchInput aria-label="Long value" className="w-full" defaultValue={LONG_VALUE} />
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Tag input">
				<FixtureCase label="default">
					<TagInput aria-label="Default" placeholder="Add a tag" />
				</FixtureCase>
				<FixtureCase label="filled">
					<TagInput aria-label="Filled" defaultValue={['React', 'TypeScript']} />
				</FixtureCase>
				<FixtureCase label="tag color">
					<TagInput aria-label="Tag color" tagColor="blue" defaultValue={['Design', 'Review']} />
				</FixtureCase>
				<FixtureCase label="disabled">
					<TagInput aria-label="Disabled" disabled defaultValue={['Locked', 'Tags']} />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Tags</Label>
						<TagInput defaultValue={['React']} />
						<Message severity="error">Add at least two tags</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="many tags, full width" wide>
					<TagInput
						aria-label="Many tags"
						className="w-full"
						defaultValue={[
							'Accessibility',
							'Internationalization',
							'Performance',
							'Documentation',
							'Design tokens',
							'Server rendering',
							'Keyboard navigation',
							'A tag label that is long enough to wrap',
						]}
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Address input">
				<FixtureCase label="default">
					<AddressInput aria-label="Default" provider={provider} />
				</FixtureCase>
				<FixtureCase label="filled">
					<AddressInput aria-label="Filled" provider={provider} defaultValue={HOME} />
				</FixtureCase>
				<FixtureCase label="disabled">
					<AddressInput aria-label="Disabled" provider={provider} disabled defaultValue={HOME} />
				</FixtureCase>
				<FixtureCase label="invalid">
					<Field severity="error" className="w-full">
						<Label>Address</Label>
						<AddressInput provider={provider} defaultValue={HOME} />
						<Message severity="error">We do not ship to this address</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="long value, full width" wide>
					<AddressInput
						aria-label="Long value"
						className="w-full"
						provider={provider}
						defaultValue={LONG_ADDRESS}
					/>
				</FixtureCase>
			</FixtureGroup>

			<FixtureGroup title="Field">
				<FixtureCase label="label and description">
					<Field className="w-full">
						<Label>Email</Label>
						<Description>We use this address for account notifications.</Description>
						<Input type="email" placeholder="jane@example.com" />
					</Field>
				</FixtureCase>
				<FixtureCase label="error">
					<Field severity="error" className="w-full">
						<Label>Email</Label>
						<Input type="email" defaultValue="jane@" />
						<Message severity="error">Enter a valid email address</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="warning">
					<Field severity="warning" className="w-full">
						<Label>Email</Label>
						<Input type="email" defaultValue="jane@example.con" />
						<Message severity="warning">Check the domain of this address</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="success">
					<Field severity="success" className="w-full">
						<Label>Username</Label>
						<Input defaultValue="jane.smith" />
						<Message severity="success">This username is available</Message>
					</Field>
				</FixtureCase>
				<FixtureCase label="disabled">
					<Field disabled className="w-full">
						<Label>Email</Label>
						<Description>The administrator manages this address.</Description>
						<Input type="email" defaultValue="jane@example.com" />
					</Field>
				</FixtureCase>
				<FixtureCase label="long label, full width" wide>
					<Field severity="error" className="w-full">
						<Label>
							A label that is long enough to wrap onto a second line in a narrow container and to
							test the spacing
						</Label>
						<Description>
							A description that is also long, so that the text wraps below the label and above the
							control in each width of the sheet.
						</Description>
						<Textarea defaultValue={LONG_VALUE} />
						<Message severity="error">
							An error message that is long enough to wrap onto more than one line at the narrow
							width of the sheet
						</Message>
					</Field>
				</FixtureCase>
			</FixtureGroup>
		</FixtureSheet>
	)
}
