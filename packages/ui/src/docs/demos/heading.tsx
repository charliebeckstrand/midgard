import { Heading } from '../../components/heading'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const levels = [1, 2, 3, 4, 5, 6] as const

export default function HeadingDemo() {
	return (
		<Example
			code={code`
				import { Heading } from 'ui/heading'

				${levels.map((l) => `<Heading level={${l}}>Heading ${l}</Heading>`)}
			`}
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
