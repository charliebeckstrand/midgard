'use client'

import { Pin } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Button } from '../button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../checkbox'
import { Control } from '../control'
import { Label } from '../fieldset'
import { Icon } from '../icon'
import { List, ListItem } from '../list'
import { k } from './variants'

export type ColumnManagerItem = {
	id: string | number
	title: ReactNode
	/** Pinned columns cannot be reordered or hidden. */
	pinned?: boolean
	/** When false, the column cannot be hidden. Defaults to true. */
	hideable?: boolean
}

export type ColumnManagerPreset = {
	order: (string | number)[]
	hidden: (string | number)[]
}

export type ColumnManagerProps = {
	columns: ColumnManagerItem[]

	order?: (string | number)[]
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void

	hidden?: Set<string | number>
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void

	onSavePreset?: (preset: ColumnManagerPreset) => void
	savePresetLabel?: ReactNode

	className?: string
}

export function ColumnManager({
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
}: ColumnManagerProps) {
	const fallbackOrder = useMemo(() => columns.map((c) => c.id), [columns])

	const [order = fallbackOrder, setOrder] = useControllable<(string | number)[]>({
		value: orderProp,
		defaultValue: defaultOrder ?? fallbackOrder,
		onChange: (next) => onOrderChange?.(next ?? []),
	})

	const [hidden = defaultHidden ?? new Set<string | number>(), setHidden] = useControllable<
		Set<string | number>
	>({
		value: hiddenProp,
		defaultValue: defaultHidden ?? new Set<string | number>(),
		onChange: (next) => onHiddenChange?.(next ?? new Set<string | number>()),
	})

	const byId = useMemo(() => {
		const map = new Map<string | number, ColumnManagerItem>()

		for (const col of columns) map.set(col.id, col)

		return map
	}, [columns])

	const pinnedColumns = useMemo(() => columns.filter((c) => c.pinned), [columns])

	const orderableColumns = useMemo(
		() => order.map((id) => byId.get(id)).filter((c): c is ColumnManagerItem => !!c && !c.pinned),
		[order, byId],
	)

	const toggle = useCallback(
		(id: string | number) => {
			const next = new Set(hidden)

			if (next.has(id)) next.delete(id)
			else next.add(id)

			setHidden(next)
		},
		[hidden, setHidden],
	)

	const getKey = useCallback((item: ColumnManagerItem) => String(item.id), [])

	const handleReorder = useCallback(
		(items: ColumnManagerItem[]) => {
			const reorderedIds = items.map((i) => i.id)

			const next: (string | number)[] = []

			let idx = 0

			for (const id of order) {
				const col = byId.get(id)

				if (!col) continue

				if (col.pinned) {
					next.push(id)
				} else {
					next.push(reorderedIds[idx] as string | number)

					idx++
				}
			}

			setOrder(next)
		},
		[order, byId, setOrder],
	)

	const handleSavePreset = useCallback(() => {
		onSavePreset?.({ order, hidden: Array.from(hidden) })
	}, [onSavePreset, order, hidden])

	return (
		<div data-slot="column-manager" className={cn(k.root, className)}>
			{pinnedColumns.length > 0 && (
				<List items={pinnedColumns} getKey={getKey} variant="plain" sortable={false}>
					{(col) => (
						<ListItem
							leading={
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

function titleText(title: ReactNode, id: string | number): string {
	return typeof title === 'string' ? title : String(id)
}
