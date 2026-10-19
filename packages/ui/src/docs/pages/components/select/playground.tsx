import { Select, SelectLabel, SelectOption, type SelectProps } from 'ui/select'

const stages = ['Draft', 'Awaiting approval from finance', 'Approved', 'Ordered']

export default function SelectPlayground(props: SelectProps<string>) {
	return (
		<Select
			aria-label="Stage"
			defaultValue="Awaiting approval from finance"
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
