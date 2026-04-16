import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Glass } from '../../components/glass'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from '../../components/menu'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

export default function MenuDemo() {
	return (
		<Stack gap={6}>
			<Example title="Dropdown Menu">
				<Menu placement="bottom-start">
					<MenuTrigger>
						<Button variant="outline">Options</Button>
					</MenuTrigger>
					<MenuContent>
						<MenuSection>
							<MenuItem>
								<MenuLabel>Edit</MenuLabel>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Duplicate</MenuLabel>
							</MenuItem>
						</MenuSection>
						<MenuSeparator />
						<MenuSection>
							<MenuItem>
								<MenuLabel>Archive</MenuLabel>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Delete</MenuLabel>
							</MenuItem>
						</MenuSection>
					</MenuContent>
				</Menu>
			</Example>

			<Example title="Context Menu">
				<Menu>
					<Card p={3} className="flex h-40 items-center justify-center">
						<span className="text-sm select-none">Right-click here</span>
					</Card>
					<MenuContent>
						<MenuSection>
							<MenuItem>
								<MenuLabel>Cut</MenuLabel>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Copy</MenuLabel>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Paste</MenuLabel>
							</MenuItem>
						</MenuSection>
						<MenuSeparator />
						<MenuSection>
							<MenuItem>
								<MenuLabel>Select All</MenuLabel>
							</MenuItem>
						</MenuSection>
					</MenuContent>
				</Menu>
			</Example>

			<Example title="Glass">
				<Glass>
					<Menu placement="bottom-start">
						<MenuTrigger>
							<Button variant="outline">Glass menu</Button>
						</MenuTrigger>
						<MenuContent>
							<MenuSection>
								<MenuItem>
									<MenuLabel>Edit</MenuLabel>
								</MenuItem>
								<MenuItem>
									<MenuLabel>Duplicate</MenuLabel>
								</MenuItem>
								<MenuItem>
									<MenuLabel>Delete</MenuLabel>
								</MenuItem>
							</MenuSection>
						</MenuContent>
					</Menu>
				</Glass>
			</Example>
		</Stack>
	)
}
