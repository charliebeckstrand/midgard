import { Select, SelectLabel, SelectOption, type SelectProps } from 'ui/select'
import { words } from '../../../data/words.ts'

const stageWords = words('purchase-stage', {
	draft: 'Draft',
	awaiting: 'Awaiting approval from finance',
	approved: 'Approved',
	ordered: 'Ordered',
})

const stages = Object.values(stageWords)

export default function SelectPlayground(props: SelectProps<string>) {
	return (
		<Select
			aria-label="Stage"
			defaultValue={stageWords.awaiting}
			displayValue={(stage) => stage}
			{...props}
		>
			{stages.map((stage) => (
				<SelectOption key={stage} value={stage}>
					<SelectLabel>{stage}</SelectLabel>
				</SelectOption>
			))}
		</Select>
	)
}
