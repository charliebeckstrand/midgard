import { Placeholder } from '../../components/placeholder'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Stack gap="sm" className="sm:max-w-90">
					<Placeholder />
				</Stack>
			</Example>
		</Stack>
	)
}
