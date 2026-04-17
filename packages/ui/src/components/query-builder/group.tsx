'use client'

import { X } from 'lucide-react'
import { cn } from '../../core'
import { Button } from '../button'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Segment, SegmentControl, SegmentItem } from '../segment'
import { useQueryBuilderContext } from './context'
import { QueryRule } from './rule'
import type { QueryCombinator, QueryGroup as QueryGroupNode } from './types'
import { k } from './variants'

// ── QueryGroup ─────────────────────────────────────────

export type QueryGroupProps = {
	group: QueryGroupNode
	/** When true, the group is the root — its "remove" button is suppressed. */
	root?: boolean
	className?: string
}

export function QueryGroup({ group, root, className }: QueryGroupProps) {
	const { updateCombinator, addRule, addGroup, remove, disabled } = useQueryBuilderContext()

	return (
		<div
			data-slot="query-group"
			data-combinator={group.combinator}
			className={cn(k.group, !root && k.groupNested, className)}
		>
			<Flex gap={2}>
				<Flex flex gap={2}>
					<Segment
						value={group.combinator}
						onValueChange={(v) => v && updateCombinator(group.id, v as QueryCombinator)}
					>
						<SegmentControl size="sm" aria-label="Combinator">
							<SegmentItem value="and">AND</SegmentItem>
							<SegmentItem value="or">OR</SegmentItem>
						</SegmentControl>
					</Segment>
				</Flex>
				{!root && (
					<Button
						variant="plain"
						aria-label="Remove group"
						disabled={disabled}
						className={k.rowRemove}
						onClick={() => remove(group.id)}
					>
						<Icon icon={<X />} />
					</Button>
				)}
			</Flex>

			<div className={k.group}>
				{group.children.map((child) =>
					child.type === 'group' ? (
						<QueryGroup key={child.id} group={child} />
					) : (
						<QueryRule key={child.id} rule={child} />
					),
				)}
			</div>

			<div className={k.actions}>
				<Button size="sm" variant="outline" disabled={disabled} onClick={() => addRule(group.id)}>
					Add rule
				</Button>
				<Button size="sm" variant="outline" disabled={disabled} onClick={() => addGroup(group.id)}>
					Add group
				</Button>
			</div>
		</div>
	)
}
