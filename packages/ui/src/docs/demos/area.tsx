import { Area } from '../components/area'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function AreaDemo() {
	return (
		<Stack gap={8}>
			<Example
				title="Default"
				code={code`
					<Area className="h-24" />
				`}
			>
				<Area className="h-24" />
			</Example>

			<Example
				title="Padding"
				code={code`
					<Area p={2}>Small</Area>
					<Area p={3}>Medium</Area>
					<Area p={5}>Large</Area>
				`}
			>
				<Stack gap={4}>
					<Area p={2}>Small</Area>
					<Area p={3}>Medium</Area>
					<Area p={5}>Large</Area>
				</Stack>
			</Example>

			<Example
				title="Border"
				code={code`
					<Area border="dashed" p={3}>Dashed</Area>
					<Area border="solid" p={3}>Solid</Area>
				`}
			>
				<Stack gap={4}>
					<Area border="dashed" p={3}>
						Dashed
					</Area>
					<Area border="solid" p={3}>
						Solid
					</Area>
				</Stack>
			</Example>
		</Stack>
	)
}
