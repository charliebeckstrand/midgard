import { ChevronDown } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSection, MenuTrigger } from 'ui/menu'
import { GlassProvider } from 'ui/providers/glass'

export default function Menus() {
	return (
		<GlassProvider>
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
						Actions
					</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuSection>
						<MenuItem>
							<MenuLabel>Edit</MenuLabel>
						</MenuItem>
						<MenuItem>
							<MenuLabel>Duplicate</MenuLabel>
						</MenuItem>
						<MenuItem>
							<MenuLabel>Delete</MenuLabel>
						</MenuItem>
					</MenuSection>
				</MenuContent>
			</Menu>
		</GlassProvider>
	)
}
