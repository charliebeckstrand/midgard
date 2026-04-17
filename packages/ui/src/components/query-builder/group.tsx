'use client'

import { cn } from '../../core'
import { Alert } from '../alert'
import { Button } from '../button'
import { Flex } from '../flex'
import { HoldButton } from '../hold-button'
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
			<div className={k.group}>
				{group.children.length === 0 ? (
					<Alert type="warning" variant="soft" description="No rules defined." block />
				) : (
					group.children.map((child, index) => (
						<div key={child.id} className="flex flex-col gap-3">
							{index > 0 && (
								<Segment
									value={child.combinator ?? 'and'}
									onValueChange={(v) => v && updateCombinator(child.id, v as QueryCombinator)}
								>
									<SegmentControl size="sm" aria-label="Combinator">
										<SegmentItem value="and">AND</SegmentItem>
										<SegmentItem value="or">OR</SegmentItem>
									</SegmentControl>
								</Segment>
							)}
							{child.type === 'group' ? <QueryGroup group={child} /> : <QueryRule rule={child} />}
						</div>
					))
				)}
			</div>

			<Flex gap={2} className={k.actions}>
				{root && (
					<Button
						variant="soft"
						color="blue"
						disabled={disabled}
						onClick={() => addGroup(group.id)}
					>
						Add group
					</Button>
				)}
				<Button variant="plain" disabled={disabled} onClick={() => addRule(group.id)}>
					Add rule
				</Button>
				{!root && (
					<Flex justify="end">
						<HoldButton
							variant="soft"
							color="red"
							aria-label="Remove group"
							disabled={disabled}
							className={k.rowRemove}
							duration={500}
							onComplete={() => remove(group.id)}
						>
							Remove group
						</HoldButton>
					</Flex>
				)}
			</Flex>
		</div>
	)
}
