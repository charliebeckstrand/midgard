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
			<DropdownButton className="rounded-lg border border-zinc-950/10 px-3 py-1.5 text-sm font-medium text-zinc-950 dark:border-white/10 dark:text-white">
				Options
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
