import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Box } from '../../components/box'
import { Button } from '../../components/button'
import { Glass } from '../../components/glass'
import { Icon } from '../../components/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from '../../components/menu'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Overlay' }

const surfaces = ['default', 'glass'] as const

export function Demo() {
	const [dropdownSurface, setDropdownSurface] = useState<(typeof surfaces)[number]>('default')
	const [contextSurface, setContextSurface] = useState<(typeof surfaces)[number]>('default')

	const dropdown = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
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
				</MenuSection>
				<MenuSection>
					<MenuItem>
						<MenuLabel>Archive</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Delete</MenuLabel>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>
	)

	const context = (
		<Menu>
			<Box className="flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-20">
				<Text variant="muted" className="select-none">
					Right-click here
				</Text>
			</Box>
			<MenuContent>
				<MenuSection>
					<MenuItem>
						<MenuLabel>Cut</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Copy</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Paste</MenuLabel>
					</MenuItem>
				</MenuSection>
				<MenuSeparator />
				<MenuSection>
					<MenuItem>
						<MenuLabel>Select All</MenuLabel>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>
	)

	return (
		<>
			<Example
				title="Dropdown menu"
				actions={
					<VariantListbox
						variants={surfaces}
						value={dropdownSurface}
						onValueChange={setDropdownSurface}
					/>
				}
			>
				{dropdownSurface === 'glass' ? <Glass>{dropdown}</Glass> : dropdown}
			</Example>

			<Example
				title="Context menu"
				actions={
					<VariantListbox
						variants={surfaces}
						value={contextSurface}
						onValueChange={setContextSurface}
					/>
				}
			>
				{contextSurface === 'glass' ? <Glass>{context}</Glass> : context}
			</Example>
		</>
	)
}
