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
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function DropdownDemo() {
	return (
		<Example
			code={`import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu, DropdownSection, DropdownSeparator } from 'ui/dropdown'
import { Button } from 'ui/button'

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
</Dropdown>`}
		>
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
		</Example>
	)
}
