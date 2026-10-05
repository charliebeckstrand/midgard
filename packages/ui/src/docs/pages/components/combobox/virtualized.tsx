import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { Field, Label } from 'ui/fieldset'
import { VirtualOptions } from 'ui/primitives/virtual-options'

const invoices = Array.from(
	{ length: 5000 },
	(_, index) => `INV-${String(index + 1).padStart(4, '0')}`,
)

function MatchingInvoices() {
	const query = useComboboxDeferredQuery().toLowerCase()

	const matches = invoices.filter((invoice) => invoice.toLowerCase().includes(query))

	return (
		<VirtualOptions items={matches} getOptionId={(invoice) => `invoice-${invoice}`}>
			{(invoice, _index, meta) => (
				<ComboboxOption key={invoice} id={`invoice-${invoice}`} value={invoice} {...meta}>
					<ComboboxLabel>{invoice}</ComboboxLabel>
				</ComboboxOption>
			)}
		</VirtualOptions>
	)
}

export default function Virtualized() {
	return (
		<Field>
			<Label>Invoice</Label>
			<Combobox placeholder="Search 5,000 invoices" displayValue={(invoice: string) => invoice}>
				<MatchingInvoices />
			</Combobox>
		</Field>
	)
}
