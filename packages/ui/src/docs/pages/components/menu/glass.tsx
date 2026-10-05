import { ChevronDown } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { GlassProvider } from 'ui/providers/glass'

export default function Glass() {
	return (
		<GlassProvider>
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
		</GlassProvider>
	)
}
