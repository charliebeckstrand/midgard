import { Heading } from '../../components/heading'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const levels = [1, 2, 3, 4, 5, 6] as const

export default function HeadingDemo() {
	return (
		<Example title="Levels">
			{levels.map((level) => (
				<Heading key={level} level={level}>
					Heading {level}
				</Heading>
			))}
		</Example>
	)
}
