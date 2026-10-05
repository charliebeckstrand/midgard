import { Select, SelectLabel, SelectOption, type SelectProps } from 'ui/select'

const stages = ['draft', 'awaiting approval from finance', 'approved', 'ordered']

export default function SelectPlayground(props: SelectProps<string>) {
	return (
		<Select
			aria-label="Stage"
			defaultValue="awaiting approval from finance"
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
