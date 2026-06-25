import { Example } from 'docs'
import { Placeholder } from '../../components/placeholder'
import { Stack } from '../../components/stack'

export function Demo() {
	return (
		<Example title="Default">
			<Stack gap="sm" className="sm:max-w-90">
				<Placeholder />
			</Stack>
		</Example>
	)
}
