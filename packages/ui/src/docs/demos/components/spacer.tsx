import { Button } from '../../../components/button'
import { Card } from '../../../components/card'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Spacer } from '../../../components/spacer'
import { Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Example title="Justify">
				<Card bg="none">
					<Flex align="center" full>
						<Heading level={3}>Title</Heading>
						<Spacer />
						<Button>Action</Button>
					</Flex>
				</Card>
			</Example>

			<Example title="Between groups">
				<Card bg="none">
					<Flex gap="md" align="center" full>
						<Button variant="plain">Back</Button>
						<Spacer />
						<Button variant="plain">Cancel</Button>
						<Button>Save</Button>
					</Flex>
				</Card>
			</Example>
		</>
	)
}
