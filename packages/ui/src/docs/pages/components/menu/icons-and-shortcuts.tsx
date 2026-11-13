import { Archive, ChevronDown, Copy, Pencil, Trash } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuShortcut, MenuTrigger } from 'ui/menu'

export default function IconsAndShortcuts() {
	return (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<Icon icon={<Pencil />} />
					<MenuLabel>Edit</MenuLabel>
					<MenuShortcut>⌘E</MenuShortcut>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Copy />} />
					<MenuLabel>Duplicate</MenuLabel>
					<MenuShortcut>⌘D</MenuShortcut>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Archive />} />
					<MenuLabel>Archive</MenuLabel>
					<MenuShortcut>⇧⌘A</MenuShortcut>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
					<MenuShortcut>⌘⌫</MenuShortcut>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
