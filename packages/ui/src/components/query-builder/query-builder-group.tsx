'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/query-builder'
import { Alert } from '../alert'
import { Button } from '../button'
import { Flex } from '../flex'
import { HoldButton } from '../hold-button'
import { Segment, SegmentControl, SegmentItem } from '../segment'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useQueryBuilderActions, useQueryBuilderState } from './context'
import { QueryBuilderRule } from './query-builder-rule'
import type { QueryCombinator, QueryGroup } from './types'

export type QueryBuilderGroupProps = {
	group: QueryGroup
	/** When true, the group is the root — its "remove" button is suppressed. */
	root?: boolean
	className?: string
}

export function QueryBuilderGroup({ group, root, className }: QueryBuilderGroupProps) {
	const { disabled } = useQueryBuilderState()

	const { updateCombinator, addRule, addGroup, remove } = useQueryBuilderActions()

	// Expose the group nesting to AT. The root is already a labelled <Fieldset>
	// (query-builder.tsx); nested groups become their own <fieldset> (implicit
	// role=group) named by aria-label. Tailwind preflight zeroes fieldset
	// border/margin/padding, so it lays out like the prior div.
	const Wrapper = root ? 'div' : 'fieldset'

	return (
		<Wrapper
			data-slot="query-group"
			data-combinator={group.combinator}
			aria-label={root ? undefined : 'Condition group'}
			className={cn(k.group, !root && k.groupNested, className)}
		>
			<div className={k.group}>
				{group.children.length === 0 ? (
					<Alert severity="warning" variant="soft" title="No rules added" block />
				) : (
					group.children.map((child, index) => (
						<div key={child.id} className="flex flex-col gap-3">
							{index > 0 && (
								<Segment
									size="sm"
									value={child.combinator ?? 'and'}
									onValueChange={(v) => v && updateCombinator(child.id, v as QueryCombinator)}
								>
									<SegmentControl aria-label="Combinator">
										<SegmentItem value="and">AND</SegmentItem>
										<SegmentItem value="or">OR</SegmentItem>
									</SegmentControl>
								</Segment>
							)}
							{child.type === 'group' ? (
								<QueryBuilderGroup group={child} />
							) : (
								<QueryBuilderRule rule={child} />
							)}
						</div>
					))
				)}
			</div>

			<Flex gap="sm" className={k.actions}>
				<Button variant="plain" disabled={disabled} onClick={() => addRule(group.id)}>
					Add rule
				</Button>
				<Button variant="soft" color="blue" disabled={disabled} onClick={() => addGroup(group.id)}>
					Add group
				</Button>
				{!root && (
					<Flex justify="end">
						<Tooltip>
							<TooltipTrigger>
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
							</TooltipTrigger>
							<TooltipContent>Hold to remove group</TooltipContent>
						</Tooltip>
					</Flex>
				)}
			</Flex>
		</Wrapper>
	)
}
