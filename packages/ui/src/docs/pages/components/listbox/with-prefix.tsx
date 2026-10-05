import { ArrowDownUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

const orders = [
	{ id: 'newest', name: 'Newest first' },
	{ id: 'oldest', name: 'Oldest first' },
	{ id: 'name', name: 'Name' },
]

export default function WithPrefix() {
	return (
		<Listbox
			aria-label="Sort by"
			defaultValue="newest"
			prefix={<Icon icon={<ArrowDownUp />} />}
			displayValue={(id) => orders.find((order) => order.id === id)?.name ?? id}
		>
			{orders.map((order) => (
				<ListboxOption key={order.id} value={order.id}>
					<ListboxLabel>{order.name}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
