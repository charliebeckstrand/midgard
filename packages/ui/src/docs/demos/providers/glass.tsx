import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	useComboboxQuery,
} from '../../../components/combobox'
import { DatePicker } from '../../../components/date-picker'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../../components/dialog'
import { Drawer, DrawerBody, DrawerFooter, DrawerTitle } from '../../../components/drawer'
import { Field, Label } from '../../../components/fieldset'
import { Flex } from '../../../components/flex'
import { Input } from '../../../components/input'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../../components/menu'
import { NumberInput } from '../../../components/number-input'
import { Select, SelectLabel, SelectOption } from '../../../components/select'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from '../../../components/sheet'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { Textarea } from '../../../components/textarea'
import { GlassProvider } from '../../../providers/glass'
import { Example } from '../../components/example'

export const meta = { category: 'Providers' }

const people = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb', 'Tom Cook'] as const

function FilteredPeople() {
	const { deferredQuery } = useComboboxQuery()

	return people
		.filter((p) => !deferredQuery || p.toLowerCase().includes(deferredQuery.toLowerCase()))
		.map((p) => (
			<ComboboxOption key={p} value={p}>
				<ComboboxLabel>{p}</ComboboxLabel>
			</ComboboxOption>
		))
}

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
					<Text>This dialog inherits glass mode from the GlassProvider wrapper.</Text>
				</DialogBody>
				<DialogFooter>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Close
					</Button>
				</DialogFooter>
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
				<DrawerFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</DrawerFooter>
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
				<SheetFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</SheetFooter>
			</Sheet>
		</>
	)
}

export function Demo() {
	const [comboboxValue, setComboboxValue] = useState<string | undefined>(undefined)

	const [date, setDate] = useState<Date | undefined>(undefined)

	return (
		<>
			<Example title="Wrapper">
				<GlassProvider>
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
				</GlassProvider>
			</Example>

			<Example title="Form controls">
				<GlassProvider>
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
								<FilteredPeople />
							</Combobox>
						</Field>
						<Field>
							<Label>Date</Label>
							<DatePicker value={date} onValueChange={setDate} />
						</Field>
					</Stack>
				</GlassProvider>
			</Example>

			<Example title="Menus">
				<GlassProvider>
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
				</GlassProvider>
			</Example>

			<Example title="Overlays">
				<GlassProvider>
					<Flex gap="md">
						<DialogExample />
						<DrawerExample />
						<SheetExample />
					</Flex>
				</GlassProvider>
			</Example>
		</>
	)
}
