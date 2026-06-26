import { Heading } from '../../components/heading'
import { Example } from '../engine'

const levels = [1, 2, 3, 4, 5, 6] as const

export function Demo() {
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
