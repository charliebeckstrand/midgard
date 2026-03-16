import { Button } from '../../components/button'
import {
	Dropdown,
	DropdownButton,
	DropdownDivider,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
	DropdownSection,
} from '../../components/dropdown'

export const meta = { category: 'Overlay' }

export default function DropdownDemo() {
	return (
		<Dropdown>
			<DropdownButton as={Button}>Options</DropdownButton>
			<DropdownMenu>
				<DropdownSection>
					<DropdownItem>
						<DropdownLabel>Edit</DropdownLabel>
					</DropdownItem>
					<DropdownItem>
						<DropdownLabel>Duplicate</DropdownLabel>
					</DropdownItem>
				</DropdownSection>
				<DropdownDivider />
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
