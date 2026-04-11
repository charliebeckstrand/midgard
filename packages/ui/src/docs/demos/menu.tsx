import { Alert, AlertDescription } from '../../components/alert'
import { Button } from '../../components/button'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from '../../components/menu'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function MenuDemo() {
	return (
		<div className="space-y-8">
			<Example title="Preview">
				<div className="flex flex-col gap-4">
					<Menu defaultOpen>
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

					<Alert type="warning">
						<AlertDescription>
							This is for demonstration purposes. <code className="font-bold">MenuContent</code>{' '}
							must be wrapped in a <code className="font-bold">Menu</code> component.
						</AlertDescription>
					</Alert>
				</div>
			</Example>

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
					<div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
						<span className="text-sm select-none">Right-click here</span>
					</div>
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
		</div>
	)
}
