import { Button } from '../../../components/button'
import { Group } from '../../../components/group'
import { Input } from '../../../components/input'
import { Tab, TabContent, TabContents, TabList } from '../../../components/tabs'
import { Stack } from '../../../structure/stack'
import { Axes, Example, PageTabs } from '../../engine'

export default function Demo() {
	return (
		<PageTabs defaultValue="button">
			<Stack gap="lg">
				<TabList aria-label="Group child">
					<Tab value="button">Button</Tab>
					<Tab value="input">Input</Tab>
				</TabList>
				<TabContents>
					<TabContent value="button">
						<Stack gap="xl">
							<Axes
								of="Group"
								render={(props) => (
									<Group {...props}>
										<Button variant="outline">Cut</Button>
										<Button variant="outline">Copy</Button>
										<Button variant="outline">Paste</Button>
									</Group>
								)}
							/>

							<Example title="Item count">
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
						</Stack>
					</TabContent>

					<TabContent value="input">
						<Stack gap="xl">
							<Axes
								of="Group"
								// An input has no `xs` step, so an `xs` group shows it at `sm`.
								values={{ size: ['sm', 'md', 'lg'] }}
								render={(props) => (
									<Group {...props}>
										<Input placeholder="First" />
										<Input placeholder="Second" />
										<Input placeholder="Third" />
									</Group>
								)}
							/>

							<Example title="Item count">
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
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</PageTabs>
	)
}
