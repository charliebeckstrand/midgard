import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { Text } from 'ui/text'

const actions = [{ label: 'Edit' }, { label: 'Duplicate' }, { label: 'Archive' }]

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
					{actions.map(({ label }) => (
						<MenuItem key={label} onAction={() => setAction(label)}>
							<MenuLabel>{label}</MenuLabel>
						</MenuItem>
					))}
				</MenuContent>
			</Menu>
			<Text>Value: {open ? 'Open' : 'Closed'}</Text>
			<Text>Last action: {action ?? 'None'}</Text>
		</>
	)
}
