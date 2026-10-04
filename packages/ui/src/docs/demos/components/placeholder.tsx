import { Placeholder } from '../../../components/placeholder'
import { Stack } from '../../../structure/stack'
import { Example } from '../../engine'

export default function Demo() {
	return (
		<Example title="Default">
			<Stack gap="sm">
				<Placeholder />
			</Stack>
		</Example>
	)
}
