'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Glass } from '../../components/glass'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from '../../components/menu'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Overlay' }

const surfaces = ['default', 'glass'] as const

export default function MenuDemo() {
	const [dropdownSurface, setDropdownSurface] = useState<(typeof surfaces)[number]>('default')
	const [contextSurface, setContextSurface] = useState<(typeof surfaces)[number]>('default')

	const dropdown = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline">Options</Button>
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
				<MenuSeparator />
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
			<div className="flex items-center justify-center p-3 h-48 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
				<span className="text-sm select-none">Or right-click here</span>
			</div>
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
		<Stack gap={6}>
			<Example
				title="Dropdown Menu"
				actions={
					<VariantListbox
						variants={surfaces}
						value={dropdownSurface}
						onChange={setDropdownSurface}
					/>
				}
			>
				{dropdownSurface === 'glass' ? <Glass>{dropdown}</Glass> : dropdown}
			</Example>

			<Example
				title="Context Menu"
				actions={
					<VariantListbox variants={surfaces} value={contextSurface} onChange={setContextSurface} />
				}
			>
				{contextSurface === 'glass' ? <Glass>{context}</Glass> : context}
			</Example>
		</Stack>
	)
}
