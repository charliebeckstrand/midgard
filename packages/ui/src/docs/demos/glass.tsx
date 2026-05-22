'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { DatePicker } from '../../components/date-picker'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../../components/dialog'
import { Drawer, DrawerActions, DrawerBody, DrawerTitle } from '../../components/drawer'
import { Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Glass } from '../../components/glass'
import { Input } from '../../components/input'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../components/menu'
import { NumberInput } from '../../components/number-input'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Sheet, SheetActions, SheetBody, SheetTitle } from '../../components/sheet'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Other' }

const people = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb', 'Tom Cook'] as const

function DialogExample() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Dialog
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTitle>Glass dialog</DialogTitle>
				<DialogBody>
					<Text>This dialog inherits glass mode from the Glass wrapper.</Text>
				</DialogBody>
				<DialogActions>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}

function DrawerExample() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Drawer
			</Button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTitle>Glass drawer</DrawerTitle>
				<DrawerBody>
					<Text>Inherits glass mode from context.</Text>
				</DrawerBody>
				<DrawerActions>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</DrawerActions>
			</Drawer>
		</>
	)
}

function SheetExample() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Sheet
			</Button>

			<Sheet side="left" open={open} onOpenChange={setOpen}>
				<SheetTitle>Glass sheet</SheetTitle>
				<SheetBody>
					<Text>Inherits glass mode from context.</Text>
				</SheetBody>
				<SheetActions>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</SheetActions>
			</Sheet>
		</>
	)
}

export function Demo() {
	const [comboboxValue, setComboboxValue] = useState<string | undefined>(undefined)

	const [date, setDate] = useState<Date | undefined>(undefined)

	return (
		<>
			<Example title="Glass wrapper">
				<Glass>
					<Stack>
						<Field>
							<Label>Input</Label>
							<Input placeholder="Glass input" />
						</Field>
						<Field>
							<Label>Textarea</Label>
							<Textarea placeholder="Glass textarea" />
						</Field>
						<Field>
							<Label>Number</Label>
							<NumberInput defaultValue={1} />
						</Field>
					</Stack>
				</Glass>
			</Example>

			<Example title="Form controls">
				<Glass>
					<Stack>
						<Field>
							<Label>Select</Label>
							<Select placeholder="Select a person" displayValue={(v: string) => v}>
								{people.map((p) => (
									<SelectOption key={p} value={p}>
										<SelectLabel>{p}</SelectLabel>
									</SelectOption>
								))}
							</Select>
						</Field>
						<Field>
							<Label>Combobox</Label>
							<Combobox
								value={comboboxValue}
								onValueChange={setComboboxValue}
								displayValue={(v: string) => v}
								placeholder="Search people"
							>
								{(query) =>
									people
										.filter((p) => !query || p.toLowerCase().includes(query.toLowerCase()))
										.map((p) => (
											<ComboboxOption key={p} value={p}>
												<ComboboxLabel>{p}</ComboboxLabel>
											</ComboboxOption>
										))
								}
							</Combobox>
						</Field>
						<Field>
							<Label>Date</Label>
							<DatePicker value={date} onValueChange={setDate} />
						</Field>
					</Stack>
				</Glass>
			</Example>

			<Example title="Menus">
				<Glass>
					<Menu placement="bottom-start">
						<MenuTrigger>
							<Button variant="outline">Glass menu</Button>
						</MenuTrigger>
						<MenuContent>
							<MenuSection>
								<MenuItem>
									<MenuLabel>Edit</MenuLabel>
								</MenuItem>
								<MenuItem>
									<MenuLabel>Duplicate</MenuLabel>
								</MenuItem>
								<MenuItem>
									<MenuLabel>Delete</MenuLabel>
								</MenuItem>
							</MenuSection>
						</MenuContent>
					</Menu>
				</Glass>
			</Example>

			<Example title="Overlays">
				<Glass>
					<Flex gap="md">
						<DialogExample />
						<DrawerExample />
						<SheetExample />
					</Flex>
				</Glass>
			</Example>
		</>
	)
}
