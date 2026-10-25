import { Listbox, ListboxLabel, ListboxOption, type ListboxProps } from 'ui/listbox'
import { tagWords } from './tags.ts'

const tags = Object.values(tagWords)

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
