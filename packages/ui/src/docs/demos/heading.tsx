import { Heading } from '../../components/heading'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const levels = [1, 2, 3, 4, 5, 6] as const

export default function HeadingDemo() {
	return (
		<Example
			code={`import { Heading } from 'ui/heading'\n\n${levels.map((l) => `<Heading level={${l}}>Heading ${l}</Heading>`).join('\n')}`}
		>
			<div className="space-y-4">
				{levels.map((level) => (
					<Heading key={level} level={level}>
						Heading {level}
					</Heading>
				))}
			</div>
		</Example>
	)
}
