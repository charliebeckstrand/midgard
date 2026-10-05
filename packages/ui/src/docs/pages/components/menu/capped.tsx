import { ChevronDown, Folder } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'

const folders = [
	'Inbox',
	'Archive',
	'Clients',
	'Contracts',
	'Invoices',
	'Receipts',
	'Taxes',
	'Travel',
	'Hiring',
	'Newsletters',
	'Personal',
	'Someday',
]

export default function Capped() {
	return (
		<Menu placement="bottom-start" capped>
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Move to
				</Button>
			</MenuTrigger>
			<MenuContent>
				{folders.map((folder) => (
					<MenuItem key={folder}>
						<Icon icon={<Folder />} />
						<MenuLabel>{folder}</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}
