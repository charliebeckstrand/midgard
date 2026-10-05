import { Listbox, ListboxLabel, ListboxOption, type ListboxProps } from 'ui/listbox'

const tags = ['bug', 'documentation', 'good first issue', 'needs review from the security team']

export default function ListboxPlayground(props: ListboxProps<string>) {
	return (
		<Listbox aria-label="Tags" displayValue={(tag) => tag} {...props}>
			{tags.map((tag) => (
				<ListboxOption key={tag} value={tag}>
					<ListboxLabel>{tag}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
