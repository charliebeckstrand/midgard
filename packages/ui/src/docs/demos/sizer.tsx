import { Input } from '../../components/input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

export default function SizerDemo() {
	return (
		<Stack gap={6}>
			<Example title="Sizes">
				{sizes.map((size) => (
					<Sizer key={size} size={size}>
						<Input placeholder={size} readOnly />
					</Sizer>
				))}
			</Example>
		</Stack>
	)
}
