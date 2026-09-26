import { Heading1, Heading2, Heading3 } from 'lucide-react'
import { Button } from '../../../components/button'
import { Group } from '../../../components/group'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Example } from '../../engine'

export function Demo() {
	return (
		<Tabs defaultValue="button">
			<Stack gap="lg">
				<TabList aria-label="Group child">
					<Tab value="button">Button</Tab>
					<Tab value="input">Input</Tab>
				</TabList>
				<TabContents>
					<TabContent value="button">
						<Stack gap="xl">
							<Example title="Default">
								<Stack gap="lg">
									<Group>
										<Button variant="outline">Cut</Button>
										<Button variant="outline">Copy</Button>
										<Button variant="outline">Paste</Button>
									</Group>

									<Group>
										<Button variant="outline">Previous</Button>
										<Button variant="outline">Next</Button>
									</Group>

									<Group>
										<Button variant="outline">Only one</Button>
									</Group>
								</Stack>
							</Example>

							<Example title="Vertical">
								<Group orientation="vertical">
									<Button aria-label="Heading 1" variant="outline">
										<Icon icon={<Heading1 />} />
									</Button>
									<Button aria-label="Heading 2" variant="outline">
										<Icon icon={<Heading2 />} />
									</Button>
									<Button aria-label="Heading 3" variant="outline">
										<Icon icon={<Heading3 />} />
									</Button>
								</Group>
							</Example>

							<Example title="Sizes">
								<Stack gap="lg">
									<Group size="sm">
										<Button variant="outline">sm</Button>
										<Button variant="outline">sm</Button>
										<Button variant="outline">sm</Button>
									</Group>
									<Group size="md">
										<Button variant="outline">md</Button>
										<Button variant="outline">md</Button>
										<Button variant="outline">md</Button>
									</Group>
									<Group size="lg">
										<Button variant="outline">lg</Button>
										<Button variant="outline">lg</Button>
										<Button variant="outline">lg</Button>
									</Group>
								</Stack>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="input">
						<Stack gap="xl">
							<Example title="Default">
								<Stack gap="lg">
									<Group>
										<Input placeholder="First" />
										<Input placeholder="Second" />
										<Input placeholder="Third" />
									</Group>

									<Group>
										<Input placeholder="First" />
										<Input placeholder="Last" />
									</Group>

									<Group>
										<Input placeholder="Only one" />
									</Group>
								</Stack>
							</Example>

							<Example title="Sizes">
								<Stack gap="lg">
									<Group size="sm">
										<Input placeholder="sm" />
										<Input placeholder="sm" />
										<Input placeholder="sm" />
									</Group>
									<Group size="md">
										<Input placeholder="md" />
										<Input placeholder="md" />
										<Input placeholder="md" />
									</Group>
									<Group size="lg">
										<Input placeholder="lg" />
										<Input placeholder="lg" />
										<Input placeholder="lg" />
									</Group>
								</Stack>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
