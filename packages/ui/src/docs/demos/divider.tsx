import { Divider } from '../../components/divider'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function DividerDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<Divider />
			</Example>
			<Example title="Soft">
				<Divider soft />
			</Example>
		</div>
	)
}
