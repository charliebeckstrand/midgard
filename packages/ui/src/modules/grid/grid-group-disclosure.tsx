'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { groupValueLabel } from './engine/grid-column/label'
import type { GridGroupBy } from './grid-data-types'

/**
 * The disclosure button of a group-header row. The group's value and count
 * (`Developer (3)`) sit at the start, or the label of a
 * {@link GridGroupBy.renderHeader} override. A chevron at the trailing edge
 * points right while collapsed and down while expanded. The client and the
 * manual group rows share it.
 *
 * @internal
 */
export function GridGroupDisclosure({
	value,
	count,
	columnId,
	renderHeader,
	expanded,
	onToggle,
}: {
	value: unknown
	count: number
	/** The grouped column id, which a `renderHeader` override receives. */
	columnId: string | number
	renderHeader: GridGroupBy['renderHeader']
	expanded: boolean
	onToggle: () => void
}) {
	const label: ReactNode = renderHeader
		? renderHeader({ columnId, value, count })
		: `${groupValueLabel(value)} (${count})`

	return (
		<Button
			type="button"
			variant="bare"
			onClick={onToggle}
			aria-expanded={expanded}
			aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${groupValueLabel(value)}`}
			className="p-0"
			suffix={
				<Icon
					icon={expanded ? <ChevronDown /> : <ChevronRight />}
					className={cn(k.rowGroup.chevron)}
				/>
			}
		>
			{label}
		</Button>
	)
}
