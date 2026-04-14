import { Divider } from '../../components/divider'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function DividerDemo() {
	return (
		<Stack gap={8}>
			<Example title="Default">
				<Divider />
			</Example>
			<Example title="Soft">
				<Divider soft />
			</Example>
		</Stack>
	)
}
