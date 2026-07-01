import { Archive, ChevronDown, Copy, SquarePen, Trash } from 'lucide-react'
import { Box } from '../../../components/box'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from '../../../components/menu'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { GlassProvider } from '../../../providers/glass'
import { Example } from '../../engine'

export function Demo() {
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
		<Stack gap="xl">
			<Example title="Default">{dropdown}</Example>

			<Example title="With icons">{icons}</Example>

			<Example title="Glass">
				<GlassProvider>{dropdown}</GlassProvider>
			</Example>

			<Example title="Context">{context}</Example>
		</Stack>
	)
}
