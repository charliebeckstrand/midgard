import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { Text } from 'ui/text'

export default function Controlled() {
	const [open, setOpen] = useState(false)

	const [action, setAction] = useState<string>()

	return (
		<>
			<Menu placement="bottom-start" open={open} onOpenChange={setOpen}>
				<MenuTrigger>
					<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
						Options
					</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem onAction={() => setAction('Edit')}>
						<MenuLabel>Edit</MenuLabel>
					</MenuItem>
					<MenuItem onAction={() => setAction('Duplicate')}>
						<MenuLabel>Duplicate</MenuLabel>
					</MenuItem>
					<MenuItem onAction={() => setAction('Archive')}>
						<MenuLabel>Archive</MenuLabel>
					</MenuItem>
				</MenuContent>
			</Menu>
			<Text>State: {open ? 'Open' : 'Closed'}</Text>
			<Text>Last action: {action ?? 'None'}</Text>
		</>
	)
}
