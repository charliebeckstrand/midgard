import type { ReactNode } from 'react'
import { Stack } from '../../components/stack'

const labelClass = 'text-zinc-500 dark:text-zinc-400'

/**
 * Groups {@link LabeledRow}s into one shared two-column grid. The label column
 * sizes to `max-content` across every row, so each label is as wide as it needs
 * to be, all labels share that one width, and the children columns line up — no
 * explicit width required. The wrapper is transparent to the docs
 * code-derivation walker.
 */
export function LabeledRows({ children }: { children: ReactNode }) {
	return <div className="grid grid-cols-[max-content_1fr] gap-4">{children}</div>
}

/**
 * Horizontal showcase row used inside demos: a text label next to the component
 * being demonstrated. Render inside {@link LabeledRows}; the row is a subgrid
 * spanning both shared columns, so every label aligns to one auto-sized column.
 * The wrapper is transparent to the docs code-derivation walker; derived
 * snippets show only `children`.
 */
export function LabeledRow({ label, children }: { label: ReactNode; children: ReactNode }) {
	return (
		<div className="grid grid-cols-subgrid col-span-2 items-center">
			<div className={labelClass}>{label}</div>
			<div className="flex">{children}</div>
		</div>
	)
}

/**
 * Vertical showcase cell: the component above, a small caption beneath.
 * Like {@link LabeledRow}, the wrapper is transparent to the code walker.
 */
export function LabeledColumn({ label, children }: { label: ReactNode; children: ReactNode }) {
	return (
		<Stack gap="sm" align="center">
			<div className={labelClass}>{label}</div>
			<div className="flex">{children}</div>
		</Stack>
	)
}
