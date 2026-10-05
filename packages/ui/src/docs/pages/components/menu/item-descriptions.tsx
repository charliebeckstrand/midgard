import { Archive, ChevronDown, Copy, Download } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuText,
	MenuTrigger,
} from 'ui/menu'

export default function ItemDescriptions() {
	return (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Share
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<Icon icon={<Copy />} />
					<MenuText>
						<MenuLabel>Copy link</MenuLabel>
						<MenuDescription>Anyone with the link can view</MenuDescription>
					</MenuText>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Download />} />
					<MenuText>
						<MenuLabel>Download</MenuLabel>
						<MenuDescription>Save a PDF copy</MenuDescription>
					</MenuText>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Archive />} />
					<MenuText>
						<MenuLabel>Archive</MenuLabel>
						<MenuDescription>Hide it from the list</MenuDescription>
					</MenuText>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
