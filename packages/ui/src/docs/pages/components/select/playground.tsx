import { Select, SelectLabel, SelectOption, type SelectProps } from 'ui/select'
import { stageWords } from './stages.ts'

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
