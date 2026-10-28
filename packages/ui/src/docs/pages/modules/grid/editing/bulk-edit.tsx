import { useMemo, useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { CurrencyInput } from 'ui/currency-input'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from 'ui/dialog'
import { Field, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form, FormSubmit } from 'ui/form'
import { Grid, type GridColumn } from 'ui/grid'
import { NumberInput } from 'ui/number-input'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { EditHelp } from './people.tsx'

type BillingRate = { id: number; name: string; hourly: number; daily: number; billable: number }

type Rates = Partial<Pick<BillingRate, 'hourly' | 'daily' | 'billable'>>

const initialRates: BillingRate[] = [
	{ id: 1, name: 'Wade Cooper', hourly: 95, daily: 720, billable: 80 },
	{ id: 2, name: 'Arlene McCoy', hourly: 90, daily: 680, billable: 75 },
	{ id: 3, name: 'Devon Webb', hourly: 110, daily: 840, billable: 60 },
	{ id: 4, name: 'Tom Cook', hourly: 85, daily: 640, billable: 85 },
	{ id: 5, name: 'Tanya Fox', hourly: 90, daily: 680, billable: 75 },
]

export default function BulkEdit() {
	const intl = useIntl()

	const [rates, setRates] = useState(initialRates)

	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [open, setOpen] = useState(false)

	const apply = (patch: Rates) => {
		setRates((prev) => prev.map((row) => (selection.has(row.id) ? { ...row, ...patch } : row)))

		setOpen(false)
	}

	// One selected row fills the form with its rates.
	const defaults = useMemo((): Rates => {
		const [only] = selection

		const row = selection.size === 1 ? rates.find((rate) => rate.id === only) : undefined

		return row ? { hourly: row.hourly, daily: row.daily, billable: row.billable } : {}
	}, [rates, selection])

	const columns = useMemo((): GridColumn<BillingRate>[] => {
		const money = (value: number) =>
			intl.formatNumber(value, { style: 'currency', currency: 'USD' })

		return [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (row) => row.name, minWidth: 150 },
			{ id: 'hourly', title: 'Hourly rate', cell: (row) => money(row.hourly), minWidth: 150 },
			{ id: 'daily', title: 'Day rate', cell: (row) => money(row.daily), minWidth: 150 },
			{
				id: 'billable',
				title: 'Billable %',
				cell: (row) => intl.formatNumber(row.billable / 100, { style: 'percent' }),
				minWidth: 150,
			},
		]
	}, [intl])

	return (
		<>
			<EditHelp label="Bulk edit help">
				Select rows, then use Edit selected to change them together.
			</EditHelp>
			<Grid
				columns={columns}
				rows={rates}
				getKey={(row) => row.id}
				selection={{
					value: selection,
					onValueChange: setSelection,
					batchActions: ({ setSelection: setSelected }) => (
						<Flex gap="sm">
							<Button variant="soft" onClick={() => setSelected(new Set())}>
								Deselect all
							</Button>
							<Button variant="soft" color="blue" onClick={() => setOpen(true)}>
								Edit selected ({selection.size})
							</Button>
						</Flex>
					),
				}}
			/>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogPanel>
					<DialogHeader>
						<DialogTitle>Edit selected ({selection.size})</DialogTitle>
					</DialogHeader>
					{selection.size > 1 && (
						<Alert severity="info" closable>
							Enter a value to apply it to each selected row. Leave a field empty to keep its
							values.
						</Alert>
					)}
					<Form
						defaultValues={defaults}
						onSubmit={(values) => {
							const patch: Rates = {}

							if (typeof values.hourly === 'number') patch.hourly = values.hourly

							if (typeof values.daily === 'number') patch.daily = values.daily

							if (typeof values.billable === 'number') patch.billable = values.billable

							apply(patch)
						}}
					>
						<DialogContent>
							<DialogBody>
								<Stack gap="lg">
									<Field>
										<Label>Hourly rate</Label>
										<CurrencyInput name="hourly" placeholder="No change" />
									</Field>
									<Field>
										<Label>Day rate</Label>
										<CurrencyInput name="daily" placeholder="No change" />
									</Field>
									<Field>
										<Label>Billable %</Label>
										<NumberInput
											name="billable"
											step={1}
											min={0}
											max={100}
											placeholder="No change"
										/>
									</Field>
								</Stack>
							</DialogBody>
							<DialogFooter>
								<Button type="button" variant="plain" onClick={() => setOpen(false)}>
									Cancel
								</Button>
								<FormSubmit color="blue">Apply</FormSubmit>
							</DialogFooter>
						</DialogContent>
					</Form>
				</DialogPanel>
			</Dialog>
		</>
	)
}
