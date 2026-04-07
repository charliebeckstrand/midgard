import { Divider } from '../../components/divider'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Layout' }

export default function DividerDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Divider } from 'ui/divider'

					<Divider />
				`}
			>
				<Divider />
			</Example>
			<Example
				title="Soft"
				code={code`
					import { Divider } from 'ui/divider'

					<Divider soft />
				`}
			>
				<Divider soft />
			</Example>
		</div>
	)
}
