import { ChevronDown, Download, Share2, SquarePen, Trash } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSub, MenuTrigger } from 'ui/menu'

export default function Submenus() {
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
				</MenuItem>
				<MenuSub label="Share" icon={<Share2 />}>
					<MenuItem>
						<MenuLabel>Copy link</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Invite by email</MenuLabel>
					</MenuItem>
				</MenuSub>
				<MenuSub label="Export" icon={<Download />}>
					<MenuItem>
						<MenuLabel>Export to CSV</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Export to Excel</MenuLabel>
					</MenuItem>
				</MenuSub>
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
