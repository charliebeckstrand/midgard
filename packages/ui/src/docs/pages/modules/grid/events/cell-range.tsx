import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, type GridCellRef, type GridRangeState } from 'ui/grid'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { columns, people } from '../data.tsx'

// The names and the roles of the first three people.
const block: GridRangeState = {
	anchor: { rowKey: people[0]?.id ?? 0, columnId: 'name' },
	focus: { rowKey: people[2]?.id ?? 0, columnId: 'role' },
}

/** A cell of the range as the reader sees it: the column, then the person. */
function describeCell({ rowKey, columnId }: GridCellRef): string {
	const column = columns.find((col) => col.id === columnId)?.title ?? String(columnId)

	const person = people.find((row) => row.id === rowKey)?.name ?? String(rowKey)

	return `${String(column)} of ${person}`
}

export default function CellRange() {
	// The page holds the range. Shift with an arrow key or a click extends it,
	// and a drag makes one. Ctrl+C or Cmd+C copies it as TSV. Escape ends it.
	const [range, setRange] = useState<GridRangeState | null>(null)

	return (
		<Stack gap="md">
			<Text tone="muted">
				<PointerHint
					mouseText="Shift-click or drag across the cells to select a range, or press Ctrl+A or Cmd+A to select all"
					touchText="Use a keyboard or a mouse to select a range of cells"
				/>
			</Text>
			<Flex gap="sm">
				<Button variant="soft" onClick={() => setRange(block)}>
					Select a block
				</Button>
				<Button variant="soft" disabled={range === null} onClick={() => setRange(null)}>
					Clear
				</Button>
			</Flex>
			<Grid
				navigable
				range={{ value: range, onValueChange: setRange }}
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
			/>
			<Text>
				Range: {range ? `${describeCell(range.anchor)} to ${describeCell(range.focus)}` : 'None'}
			</Text>
		</Stack>
	)
}
