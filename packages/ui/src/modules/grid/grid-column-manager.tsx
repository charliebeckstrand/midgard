'use client'

import { Pin } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid-column-manager'
import { toggleItem } from '../../utilities'
import { applyColumnReorder } from './grid-reorder'
import type { GridColumnManagerItem, GridColumnManagerPreset } from './types'
import { useGridColumnVisibility } from './use-grid-column-visibility'

/** Props for {@link GridColumnManager}. */
export type GridColumnManagerProps = {
	columns: GridColumnManagerItem[]

	order?: (string | number)[]
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void

	hidden?: Set<string | number>
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void

	/** Called with the current order and hidden ids when the save-preset button is pressed; presence of the handler also shows the button. */
	onSavePreset?: (preset: GridColumnManagerPreset) => void
	/**
	 * Label on the save-preset button.
	 * @defaultValue 'Save as preset'
	 */
	savePresetLabel?: ReactNode

	className?: string
}

/** A column's display string for ARIA labels: its `title` when a string, else the stringified id. @internal */
function titleText(title: ReactNode, id: string | number): string {
	return typeof title === 'string' ? title : String(id)
}

/**
 * Standalone column-visibility editor: a drag-sortable list of checkbox fields,
 * one per orderable column, that toggles each column's hidden state and
 * reorders the rest. Pinned columns list first in a separate, fixed group
 * (checked and disabled); columns with `hideable: false` show but cannot be
 * unchecked. With `onSavePreset`, a footer button captures the current order
 * and hidden ids as a {@link GridColumnManagerPreset}. Order and hidden
 * set are each controllable.
 *
 * @remarks Client component. {@link Grid} renders this inside its own
 * dialog when `columnManager` is configured; use this directly to host the
 * editor elsewhere (e.g. a settings panel).
 */
export function GridColumnManager({
	columns,
	order: orderProp,
	defaultOrder,
	onOrderChange,
	hidden: hiddenProp,
	defaultHidden,
	onHiddenChange,
	onSavePreset,
	savePresetLabel = 'Save as preset',
	className,
}: GridColumnManagerProps) {
	const { order, setOrder, hidden, setHidden, byId } = useGridColumnVisibility({
		columns,
		order: orderProp,
		defaultOrder,
		onOrderChange,
		hidden: hiddenProp,
		defaultHidden,
		onHiddenChange,
	})

	const pinnedColumns = useMemo(() => columns.filter((c) => c.pinned), [columns])

	const orderableColumns = useMemo(
		() =>
			order.map((id) => byId.get(id)).filter((c): c is GridColumnManagerItem => !!c && !c.pinned),
		[order, byId],
	)

	const toggle = useCallback(
		(id: string | number) => {
			setHidden((prev) => toggleItem(prev ?? new Set<string | number>(), id))
		},
		[setHidden],
	)

	const getKey = useCallback((item: GridColumnManagerItem) => String(item.id), [])

	const handleReorder = useCallback(
		(items: GridColumnManagerItem[]) => {
			const reorderedIds = items.map((i) => i.id)

			// Ids outside the manager's set (select/actions) and pinned columns keep
			// their position; only the orderable data columns are repermuted.
			setOrder(
				applyColumnReorder(order, reorderedIds, (id) => {
					const col = byId.get(id)

					return !!col && !col.pinned
				}),
			)
		},
		[order, byId, setOrder],
	)

	const handleSavePreset = useCallback(() => {
		onSavePreset?.({ order, hidden: Array.from(hidden) })
	}, [onSavePreset, order, hidden])

	return (
		<div data-slot="grid-column-manager" className={cn(k.root, className)}>
			{pinnedColumns.length > 0 && (
				<List items={pinnedColumns} getKey={getKey} variant="plain" sortable={false}>
					{(col) => (
						<ListItem
							prefix={
								<span aria-hidden="true" className={cn(k.pin)}>
									<Icon icon={<Pin />} />
								</span>
							}
						>
							<Control>
								<CheckboxGroup>
									<CheckboxField>
										<Checkbox
											checked
											disabled
											aria-label={`${titleText(col.title, col.id)} (pinned)`}
										/>
										<Label>{col.title}</Label>
									</CheckboxField>
								</CheckboxGroup>
							</Control>
						</ListItem>
					)}
				</List>
			)}
			<List
				items={orderableColumns}
				getKey={getKey}
				onReorder={handleReorder}
				variant="plain"
				aria-label="Reorder columns"
			>
				{(col) => (
					<ListItem>
						<Control>
							<CheckboxGroup>
								<CheckboxField>
									<Checkbox
										checked={!hidden.has(col.id)}
										disabled={col.hideable === false}
										onChange={() => toggle(col.id)}
										aria-label={`Show ${titleText(col.title, col.id)}`}
									/>
									<Label>{col.title}</Label>
								</CheckboxField>
							</CheckboxGroup>
						</Control>
					</ListItem>
				)}
			</List>
			{onSavePreset && (
				<div className={cn(k.footer)}>
					<Button variant="soft" size="sm" onClick={handleSavePreset}>
						{savePresetLabel}
					</Button>
				</div>
			)}
		</div>
	)
}
