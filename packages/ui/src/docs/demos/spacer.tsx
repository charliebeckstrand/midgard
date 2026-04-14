import { Area } from '../../components/area'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function SpacerDemo() {
	return (
		<Stack gap={8}>
			<Example
				title="Push apart"
				code={code`
					import { Stack } from 'ui/stack'
					import { Spacer } from 'ui/spacer'
					import { Button } from 'ui/button'
					import { Heading } from 'ui/heading'

					<Stack direction="row" align="center">
						<Heading level={3}>Title</Heading>
						<Spacer />
						<Button>Action</Button>
					</Stack>
				`}
			>
				<Area padding="md" className="w-full">
					<Stack direction="row" align="center">
						<Heading level={3}>Title</Heading>
						<Spacer />
						<Button>Action</Button>
					</Stack>
				</Area>
			</Example>

			<Example
				title="Between groups"
				code={code`
					import { Stack } from 'ui/stack'
					import { Spacer } from 'ui/spacer'
					import { Button } from 'ui/button'

					<Stack direction="row" gap={3} align="center">
						<Button variant="plain">Back</Button>
						<Spacer />
						<Button variant="plain">Cancel</Button>
						<Button>Save</Button>
					</Stack>
				`}
			>
				<Area padding="md" className="w-full">
					<Stack direction="row" gap={3} align="center">
						<Button variant="plain">Back</Button>
						<Spacer />
						<Button variant="plain">Cancel</Button>
						<Button>Save</Button>
					</Stack>
				</Area>
			</Example>
		</Stack>
	)
}
