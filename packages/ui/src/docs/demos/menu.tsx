import { Archive, ChevronDown, Copy, SquarePen, Trash } from 'lucide-react'
import { useState } from 'react'
import { Box } from '../../components/box'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
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
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Text } from '../../components/text'
import { GlassProvider } from '../../providers/glass'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

const surfaces = ['default', 'glass'] as const

export function Demo() {
	const [dropdownSurface, setDropdownSurface] = useState<(typeof surfaces)[number]>('default')
	const [iconsSurface, setIconsSurface] = useState<(typeof surfaces)[number]>('default')
	const [contextSurface, setContextSurface] = useState<(typeof surfaces)[number]>('default')

	const dropdown = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<MenuLabel>Edit</MenuLabel>
				</MenuItem>
				<MenuItem>
					<MenuLabel>Duplicate</MenuLabel>
				</MenuItem>
				<MenuItem>
					<MenuLabel>Archive</MenuLabel>
				</MenuItem>
				<MenuItem>
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)

	const icons = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<Icon icon={<SquarePen />} />
					<MenuLabel>Edit</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Copy />} />
					<MenuLabel>Duplicate</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Archive />} />
					<MenuLabel>Archive</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)

	const context = (
		<Menu>
			<Box className="flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-20">
				<Text severity="muted" className="select-none">
					Right-click here
				</Text>
			</Box>
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
	)

	return (
		<Tabs defaultValue="dropdown">
			<Stack gap="lg">
				<TabList aria-label="Menu type">
					<Tab value="dropdown">Dropdown</Tab>
					<Tab value="context">Context</Tab>
				</TabList>
				<TabContents>
					<TabContent value="dropdown">
						<Stack gap="xl">
							<Example
								title="Default"
								actions={
									<VariantListbox
										variants={surfaces}
										value={dropdownSurface}
										onValueChange={setDropdownSurface}
									/>
								}
							>
								{dropdownSurface === 'glass' ? <GlassProvider>{dropdown}</GlassProvider> : dropdown}
							</Example>

							<Example
								title="With icons"
								actions={
									<VariantListbox
										variants={surfaces}
										value={iconsSurface}
										onValueChange={setIconsSurface}
									/>
								}
							>
								{iconsSurface === 'glass' ? <GlassProvider>{icons}</GlassProvider> : icons}
							</Example>
						</Stack>
					</TabContent>
					<TabContent value="context">
						<Stack gap="xl">
							<Example
								title="Default"
								actions={
									<VariantListbox
										variants={surfaces}
										value={contextSurface}
										onValueChange={setContextSurface}
									/>
								}
							>
								{contextSurface === 'glass' ? <GlassProvider>{context}</GlassProvider> : context}
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
