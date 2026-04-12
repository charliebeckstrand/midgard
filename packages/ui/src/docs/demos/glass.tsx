'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { DatePicker } from '../../components/datepicker'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../../components/dialog'
import { Drawer, DrawerActions, DrawerBody, DrawerTitle } from '../../components/drawer'
import { Field, Label } from '../../components/fieldset'
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
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Other' }

const people = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb', 'Tom Cook']

export default function GlassDemo() {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [sheetOpen, setSheetOpen] = useState(false)

	const [comboboxValue, setComboboxValue] = useState<string | undefined>(undefined)

	const [date, setDate] = useState<Date | undefined>(undefined)

	return (
		<div className="space-y-8">
			<Example title="Glass wrapper">
				<Glass>
					<div className="flex flex-col gap-4 lg:max-w-sm">
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
					</div>
				</Glass>
			</Example>

			<Example title="Form controls">
				<Glass>
					<div className="flex flex-col gap-4 lg:max-w-sm">
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
								onChange={setComboboxValue}
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
							<DatePicker value={date} onChange={setDate} />
						</Field>
					</div>
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
					<div className="flex gap-3">
						<Button onClick={() => setDialogOpen(true)}>Dialog</Button>

						<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
							<DialogTitle>Glass dialog</DialogTitle>
							<DialogBody>
								<Text>This dialog inherits glass mode from the Glass wrapper.</Text>
							</DialogBody>
							<DialogActions>
								<Button variant="plain" onClick={() => setDialogOpen(false)}>
									Close
								</Button>
							</DialogActions>
						</Dialog>

						<Button variant="outline" onClick={() => setDrawerOpen(true)}>
							Drawer
						</Button>

						<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
							<DrawerTitle>Glass drawer</DrawerTitle>
							<DrawerBody>
								<Text>Inherits glass mode from context.</Text>
							</DrawerBody>
							<DrawerActions>
								<Button onClick={() => setDrawerOpen(false)}>Close</Button>
							</DrawerActions>
						</Drawer>

						<Button variant="outline" onClick={() => setSheetOpen(true)}>
							Sheet
						</Button>

						<Sheet side="left" open={sheetOpen} onClose={() => setSheetOpen(false)}>
							<SheetTitle>Glass sheet</SheetTitle>
							<SheetBody>
								<Text>Inherits glass mode from context.</Text>
							</SheetBody>
							<SheetActions>
								<Button onClick={() => setSheetOpen(false)}>Close</Button>
							</SheetActions>
						</Sheet>
					</div>
				</Glass>
			</Example>
		</div>
	)
}
