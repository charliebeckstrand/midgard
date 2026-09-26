import { Placeholder } from '../../../components/placeholder'
import { Stack } from '../../../structure/stack'
import { Example } from '../../engine'

export function Demo() {
	return (
		<Example title="Default">
			<Stack gap="sm" className="sm:max-w-90">
				<Placeholder />
			</Stack>
		</Example>
	)
}
