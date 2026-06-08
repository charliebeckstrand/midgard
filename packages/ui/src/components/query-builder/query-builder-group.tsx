'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/query-builder'
import { Alert } from '../alert'
import { Button } from '../button'
import { Flex } from '../flex'
import { HoldButton } from '../hold-button'
import { Segment, SegmentControl, SegmentItem } from '../segment'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useFocusableRef, useQueryBuilderActions, useQueryBuilderState } from './context'
import { QueryBuilderRule } from './query-builder-rule'
import { focusKeys } from './query-builder-utilities'
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

	const addRuleRef = useFocusableRef(focusKeys.add(group.id))

	const removeRef = useFocusableRef(focusKeys.node(group.id))

	// The root renders as a plain <div>; nested groups render as <fieldset>
	// (implicit role=group) named by aria-label, exposing nesting to AT.
	// Tailwind preflight zeroes fieldset border/margin/padding.
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
				<Button
					ref={addRuleRef}
					variant="plain"
					disabled={disabled}
					onClick={() => addRule(group.id)}
				>
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
									ref={removeRef}
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
