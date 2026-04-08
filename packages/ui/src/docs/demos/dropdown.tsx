import { Button } from '../../components/button'
import {
	Dropdown,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
	DropdownSection,
	DropdownSeparator,
	DropdownTrigger,
} from '../../components/dropdown'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function DropdownDemo() {
	return (
		<Example
			code={code`
				import { Dropdown, DropdownTrigger, DropdownItem, DropdownLabel, DropdownMenu, DropdownSection, DropdownSeparator } from 'ui/dropdown'
				import { Button } from 'ui/button'

				<Dropdown>
					<DropdownTrigger>
						<Button variant="outline">Options</Button>
					</DropdownTrigger>
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
			`}
		>
			<Dropdown>
				<DropdownTrigger>
					<Button variant="outline">Options</Button>
				</DropdownTrigger>
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
		</Example>
	)
}
