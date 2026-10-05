import { ChevronDown } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuHeading,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from 'ui/menu'

export default function Sections() {
	return (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					View
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuSection>
					<MenuHeading>Sort by</MenuHeading>
					<MenuItem>
						<MenuLabel>Name</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Date modified</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Size</MenuLabel>
					</MenuItem>
				</MenuSection>
				<MenuSeparator />
				<MenuSection>
					<MenuHeading>Group by</MenuHeading>
					<MenuItem>
						<MenuLabel>Type</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Owner</MenuLabel>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>
	)
}
