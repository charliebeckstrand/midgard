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
import { Form } from 'ui/form'
import { Grid, type GridColumn } from 'ui/grid'
import { NumberInput } from 'ui/number-input'
import { useFormat } from 'ui/providers/locale'
import { Stack } from 'ui/stack'
import { EditHelp } from './people.tsx'

type LaneRate = { id: number; state: string; perMile: number; minCharge: number; fuelPct: number }

type Rates = Partial<Pick<LaneRate, 'perMile' | 'minCharge' | 'fuelPct'>>

const initialRates: LaneRate[] = [
	{ id: 1, state: 'CA', perMile: 2.35, minCharge: 250, fuelPct: 28 },
	{ id: 2, state: 'NV', perMile: 2.2, minCharge: 225, fuelPct: 26 },
	{ id: 3, state: 'AZ', perMile: 2.1, minCharge: 210, fuelPct: 25 },
	{ id: 4, state: 'OR', perMile: 2.3, minCharge: 240, fuelPct: 27 },
	{ id: 5, state: 'WA', perMile: 2.4, minCharge: 255, fuelPct: 28 },
	{ id: 6, state: 'TX', perMile: 2.15, minCharge: 215, fuelPct: 26 },
]

export default function BulkEdit() {
	const money = useFormat({ type: 'currency' })

	const [rates, setRates] = useState(initialRates)

	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [open, setOpen] = useState(false)

	const apply = (patch: Rates) => {
		setRates((current) =>
			current.map((row) => (selection.has(row.id) ? { ...row, ...patch } : row)),
		)

		setOpen(false)
	}

	// One selected row fills the form with its rates.
	const defaults = useMemo((): Rates => {
		const [only] = selection

		const row = selection.size === 1 ? rates.find((rate) => rate.id === only) : undefined

		return row ? { perMile: row.perMile, minCharge: row.minCharge, fuelPct: row.fuelPct } : {}
	}, [rates, selection])

	const columns = useMemo(
		(): GridColumn<LaneRate>[] => [
			{ id: 'select', selectable: true },
			{ id: 'state', title: 'State', cell: (row) => row.state, width: '80px' },
			{ id: 'perMile', title: 'Per-mile', cell: (row) => money(row.perMile) },
			{ id: 'minCharge', title: 'Min charge', cell: (row) => money(row.minCharge) },
			{ id: 'fuelPct', title: 'Fuel %', cell: (row) => `${row.fuelPct}%` },
		],
		[money],
	)

	return (
		<>
			<EditHelp label="Bulk edit help">
				Select rows with the checkboxes, then choose Edit selected to apply one change across every
				selected row at once through a dialog.
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
							Enter a value to apply it across all selected rows; leave blank to keep current
							values.
						</Alert>
					)}
					<Form
						defaultValues={defaults}
						onSubmit={(values) => {
							const patch: Rates = {}

							if (typeof values.perMile === 'number') patch.perMile = values.perMile

							if (typeof values.minCharge === 'number') patch.minCharge = values.minCharge

							if (typeof values.fuelPct === 'number') patch.fuelPct = values.fuelPct

							apply(patch)
						}}
					>
						<DialogContent>
							<DialogBody>
								<Stack gap="lg">
									<Field>
										<Label>Per-mile</Label>
										<CurrencyInput name="perMile" placeholder="No change" />
									</Field>
									<Field>
										<Label>Min charge</Label>
										<CurrencyInput name="minCharge" placeholder="No change" />
									</Field>
									<Field>
										<Label>Fuel %</Label>
										<NumberInput
											name="fuelPct"
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
								<Button type="submit" color="blue">
									Apply
								</Button>
							</DialogFooter>
						</DialogContent>
					</Form>
				</DialogPanel>
			</Dialog>
		</>
	)
}
