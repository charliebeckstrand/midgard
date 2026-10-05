import { Archive, ChevronDown, Copy, SquarePen, Trash } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	MenuShortcut,
	MenuTrigger,
} from 'ui/menu'

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
					<Icon icon={<SquarePen />} />
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
				<MenuSeparator />
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
					<MenuShortcut>⌘⌫</MenuShortcut>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
