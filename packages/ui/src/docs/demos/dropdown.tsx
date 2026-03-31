import { buttonVariants } from '../../components/button'
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
			<DropdownButton className={buttonVariants({ variant: 'outline' })}>Options</DropdownButton>
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
