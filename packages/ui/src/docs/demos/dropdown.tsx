import { Button } from '../../components/button'
import {
	Dropdown,
	DropdownButton,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
	DropdownSection,
	DropdownSeparator,
} from '../../components/dropdown'

export const meta = { category: 'Overlay' }

export default function DropdownDemo() {
	return (
		<Dropdown>
			<DropdownButton>
				<Button variant="outline">Options</Button>
			</DropdownButton>
			<DropdownMenu>
				<DropdownSection>
					<DropdownItem>
						<DropdownLabel>Edit</DropdownLabel>
					</DropdownItem>
					<DropdownItem>
						<DropdownLabel>Duplicate</DropdownLabel>
					</DropdownItem>
				</DropdownSection>
				<DropdownSeparator />
				<DropdownSection>
					<DropdownItem>
						<DropdownLabel>Archive</DropdownLabel>
					</DropdownItem>
					<DropdownItem>
						<DropdownLabel>Delete</DropdownLabel>
					</DropdownItem>
				</DropdownSection>
			</DropdownMenu>
		</Dropdown>
	)
}
