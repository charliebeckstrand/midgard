import { Archive, ChevronDown, Copy, SquarePen, Trash } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../../components/menu'
import { Stack } from '../../../components/stack'
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

	return (
		<Stack gap="xl">
			<Example title="Default">{dropdown}</Example>

			<Example title="With icons">{icons}</Example>

			<Example title="Glass">
				<GlassProvider>{dropdown}</GlassProvider>
			</Example>
		</Stack>
	)
}
