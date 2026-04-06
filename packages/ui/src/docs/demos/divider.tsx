import { Divider } from '../../components/divider'
import { Example } from '../example'

export const meta = { category: 'Layout' }

export default function DividerDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default" code={`import { Divider } from 'ui/divider'\n\n<Divider />`}>
				<Divider />
			</Example>
			<Example title="Soft" code={`import { Divider } from 'ui/divider'\n\n<Divider soft />`}>
				<Divider soft />
			</Example>
		</div>
	)
}
