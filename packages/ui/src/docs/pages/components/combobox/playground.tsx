import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	type ComboboxProps,
	useComboboxDeferredQuery,
} from 'ui/combobox'
import { topics } from '../../../data/topics.ts'

const options = [
	topics.accessibility,
	topics.designSystems,
	topics.performance,
	topics.serverRendering,
	topics.testing,
]

function MatchingTopics() {
	const query = useComboboxDeferredQuery().toLowerCase()

	return options
		.filter((topic) => topic.toLowerCase().includes(query))
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
