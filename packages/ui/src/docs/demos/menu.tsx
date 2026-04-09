import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuShortcut,
} from '../../components/menu'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

export default function MenuDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Context Menu"
				code={code`
					import { Menu, MenuContent, MenuItem, MenuLabel, MenuSection, MenuSeparator, MenuShortcut } from 'ui/menu'

					<Menu>
						<div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
							<span className="text-sm text-zinc-500">Right-click here</span>
						</div>
						<MenuContent>
							<MenuSection>
								<MenuItem>
									<MenuLabel>Cut</MenuLabel>
									<MenuShortcut>⌘X</MenuShortcut>
								</MenuItem>
								<MenuItem>
									<MenuLabel>Copy</MenuLabel>
									<MenuShortcut>⌘C</MenuShortcut>
								</MenuItem>
								<MenuItem>
									<MenuLabel>Paste</MenuLabel>
									<MenuShortcut>⌘V</MenuShortcut>
								</MenuItem>
							</MenuSection>
							<MenuSeparator />
							<MenuSection>
								<MenuItem>
									<MenuLabel>Select All</MenuLabel>
									<MenuShortcut>⌘A</MenuShortcut>
								</MenuItem>
							</MenuSection>
						</MenuContent>
					</Menu>
				`}
			>
				<Menu>
					<div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
						<span className="text-sm text-zinc-500">Right-click here</span>
					</div>
					<MenuContent>
						<MenuSection>
							<MenuItem>
								<MenuLabel>Cut</MenuLabel>
								<MenuShortcut>&#8984;X</MenuShortcut>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Copy</MenuLabel>
								<MenuShortcut>&#8984;C</MenuShortcut>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Paste</MenuLabel>
								<MenuShortcut>&#8984;V</MenuShortcut>
							</MenuItem>
						</MenuSection>
						<MenuSeparator />
						<MenuSection>
							<MenuItem>
								<MenuLabel>Select All</MenuLabel>
								<MenuShortcut>&#8984;A</MenuShortcut>
							</MenuItem>
						</MenuSection>
					</MenuContent>
				</Menu>
			</Example>

			<Example
				title="With Disabled Items"
				code={code`
					import { Menu, MenuContent, MenuItem, MenuLabel, MenuSection } from 'ui/menu'

					<Menu>
						<div className="...">Right-click here</div>
						<MenuContent>
							<MenuSection>
								<MenuItem onAction={() => console.log('edit')}>
									<MenuLabel>Edit</MenuLabel>
								</MenuItem>
								<MenuItem disabled>
									<MenuLabel>Delete</MenuLabel>
								</MenuItem>
							</MenuSection>
						</MenuContent>
					</Menu>
				`}
			>
				<Menu>
					<div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
						<span className="text-sm text-zinc-500">Right-click here</span>
					</div>
					<MenuContent>
						<MenuSection>
							<MenuItem>
								<MenuLabel>Edit</MenuLabel>
							</MenuItem>
							<MenuItem>
								<MenuLabel>Duplicate</MenuLabel>
							</MenuItem>
							<MenuItem disabled>
								<MenuLabel>Delete</MenuLabel>
							</MenuItem>
						</MenuSection>
					</MenuContent>
				</Menu>
			</Example>
		</div>
	)
}
