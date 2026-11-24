import { Flex } from 'ui/flex'
import { NumberInput } from 'ui/number-input'

export default function Width() {
	return (
		<Flex gap="sm">
			<NumberInput aria-label="Rows" defaultValue={3} min={0} />
			<NumberInput aria-label="Columns" defaultValue={12} min={0} width="fill" />
		</Flex>
	)
}
