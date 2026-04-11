import { Area } from '../../components/area'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function AreaDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Area } from 'ui/area'

					<Area className="h-24" />
				`}
			>
				<Area className="h-24" />
			</Example>

			<Example
				title="Padding"
				code={code`
					import { Area } from 'ui/area'

					<Area padding="sm">Small</Area>
					<Area padding="md">Medium</Area>
					<Area padding="lg">Large</Area>
				`}
			>
				<div className="space-y-3">
					<Area padding="sm">Small</Area>
					<Area padding="md">Medium</Area>
					<Area padding="lg">Large</Area>
				</div>
			</Example>

			<Example
				title="Border"
				code={code`
					import { Area } from 'ui/area'

					<Area border="dashed" padding="md">Dashed</Area>
					<Area border="solid" padding="md">Solid</Area>
				`}
			>
				<div className="space-y-3">
					<Area border="dashed" padding="md">
						Dashed
					</Area>
					<Area border="solid" padding="md">
						Solid
					</Area>
				</div>
			</Example>
		</div>
	)
}
