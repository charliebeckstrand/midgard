import { ChevronDown } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	type MenuProps,
	MenuSeparator,
	MenuTrigger,
} from 'ui/menu'

export default function MenuPlayground(props: MenuProps) {
	return (
		<Menu placement="bottom-start" {...props}>
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
				<MenuSeparator />
				<MenuItem>
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
