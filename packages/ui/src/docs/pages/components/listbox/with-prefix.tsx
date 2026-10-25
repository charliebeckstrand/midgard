import { ArrowDownUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

const orders = [
	{ id: 'newest', label: 'Newest first' },
	{ id: 'oldest', label: 'Oldest first' },
	{ id: 'name', label: 'Name' },
]

export default function WithPrefix() {
	return (
		<Listbox
			aria-label="Sort by"
			defaultValue="newest"
			prefix={<Icon icon={<ArrowDownUp />} />}
			displayValue={(id) => orders.find((order) => order.id === id)?.label ?? id}
		>
			{orders.map((order) => (
				<ListboxOption key={order.id} value={order.id}>
					<ListboxLabel>{order.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
