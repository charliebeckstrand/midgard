/**
 * What a drawer of form fields pays to open.
 *
 * The field set is the place form of the Places app, in `ui` parts only: four
 * inputs, an address search, a multiple listbox, a date picker, a rating, a
 * textarea, and a file picker, in one `Form`. The address search asks a stub
 * provider, so no request leaves the page.
 *
 * The form takes a new key on each open, so each open seeds the form again and
 * mounts the field set. The bench drives the open state through the root, under
 * `flushSync`, as a click handler of a consumer does. The untimed hook of each
 * iteration closes the drawer, so the open comes while the exit of that close
 * still runs. The exit holds the panel that it was given, so the close mounts
 * nothing. Read the gap: `empty panel` is the floor, and the step to `field
 * set` is the mount of the fields.
 */

import { AddressInput, type AddressProvider } from '../../components/address-input'
import { DatePicker } from '../../components/date-picker'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../components/drawer'
import { Field, Label } from '../../components/fieldset'
import { FileUploadInput } from '../../components/file-upload'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Rating } from '../../components/rating'
import { Textarea } from '../../components/textarea'
import { Form } from '../../modules/form'
import { compareBenches } from '../compare'
import { reactHost, settle, WINDOW } from './harness'

/** A provider that finds nothing, so the search field mounts with no request. */
const provider: AddressProvider = async () => []

/** The categories of the listbox, as the Places app gives them. */
const CATEGORIES = ['Food', 'Entertainment', 'Nature', 'Shopping', 'Other']

/** The values that the form seeds from. */
const DEFAULT_VALUES = {
	place: undefined,
	name: 'Clearwater Restaurant',
	address: '123 Main Street',
	website: 'https://example.com',
	categories: ['Food'],
	visitedAt: undefined,
	rating: 4,
	review: 'The noodles.',
}

/** The fields of the place form, in the order that the form shows them. */
const FIELD_SET = (
	<>
		<Field>
			<Label>Search</Label>
			<AddressInput name="place" provider={provider} placeholder="Clearwater Restaurant" />
		</Field>

		<Field>
			<Label>Name</Label>
			<Input name="name" />
		</Field>

		<Field>
			<Label>Address</Label>
			<Input name="address" />
		</Field>

		<Field>
			<Label>Website</Label>
			<Input name="website" type="url" />
		</Field>

		<Field>
			<Label>Categories</Label>
			<Listbox<string> name="categories" multiple clearable placeholder="All categories">
				{CATEGORIES.map((category) => (
					<ListboxOption key={category} value={category}>
						<ListboxLabel>{category}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>

		<Field>
			<Label>Visited</Label>
			<DatePicker name="visitedAt" />
		</Field>

		<Field>
			<Label>Rating</Label>
			<Rating name="rating" size="lg" step={0.5} />
		</Field>

		<Field>
			<Label>Review</Label>
			<Textarea name="review" rows={3} autoResize />
		</Field>

		<Field>
			<Label>Photos</Label>
			<FileUploadInput value={null} multiple accept="image/*" placeholder="Add photos" />
		</Field>
	</>
)

/** The drawer of one row. The form takes `formKey`, which moves on each open. */
function FormDrawer({
	open,
	fields,
	formKey,
}: {
	open: boolean
	fields: boolean
	formKey: number
}) {
	return (
		<Drawer open={open} onOpenChange={() => {}}>
			<DrawerPanel aria-label="Add place" height="fit">
				<DrawerTitle>Add place</DrawerTitle>

				{fields ? (
					<Form key={formKey} defaultValues={DEFAULT_VALUES}>
						<DrawerBody>{FIELD_SET}</DrawerBody>
					</Form>
				) : null}
			</DrawerPanel>
		</Drawer>
	)
}

/** One drawer for one row, mounted open and settled. */
async function mountDrawer(fields: boolean) {
	const mounted = reactHost()

	let opens = 1

	mounted.render(<FormDrawer open fields={fields} formKey={opens} />)

	await settle(3)

	return {
		close: () => {
			mounted.render(<FormDrawer open={false} fields={fields} formKey={opens} />)
		},
		open: () => {
			opens += 1

			mounted.render(<FormDrawer open fields={fields} formKey={opens} />)
		},
	}
}

const drawers = [
	{ name: 'empty panel (the floor)', drawer: await mountDrawer(false) },
	{ name: 'field set', drawer: await mountDrawer(true) },
]

compareBenches(
	'drawer · open of a form drawer · place form',
	(bench) => {
		for (const { name, drawer } of drawers) {
			bench(name, { beforeEach: drawer.close }, drawer.open)
		}
	},
	WINDOW.slow,
)
