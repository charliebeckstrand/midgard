import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	type ComboboxProps,
	useComboboxDeferredQuery,
} from 'ui/combobox'

const topics = [
	'accessibility',
	'design systems',
	'performance',
	'server rendering and streaming',
	'testing',
]

function MatchingTopics() {
	const query = useComboboxDeferredQuery().toLowerCase()

	return topics
		.filter((topic) => topic.includes(query))
		.map((topic) => (
			<ComboboxOption key={topic} value={topic}>
				<ComboboxLabel>{topic}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function ComboboxPlayground(props: ComboboxProps<string>) {
	return (
		<Combobox
			aria-label="Topic"
			placeholder="Search topics"
			displayValue={(topic) => topic}
			{...props}
		>
			<MatchingTopics />
		</Combobox>
	)
}
