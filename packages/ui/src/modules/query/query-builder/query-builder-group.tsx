'use client'

import { ChevronDown, CopyPlus, Plus } from 'lucide-react'
import { memo } from 'react'
import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { HoldButton } from '../../../components/hold-button'
import { Icon } from '../../../components/icon'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/query-builder'
import type { QueryCombinator, QueryGroup } from '../engine/types'
import { useFocusableRef, useQueryBuilderActions, useQueryBuilderState } from './context'
import { focusKeys } from './query-builder-focus'
import { QueryBuilderRule } from './query-builder-rule'

/** Props for {@link QueryBuilderGroup}: the group node to render and whether it is the tree root. */
export type QueryBuilderGroupProps = {
	group: QueryGroup
	/** When true, the group is the root and omits its "remove" button. */
	root?: boolean
	className?: string
}

/**
 * Renders one query group: its child rules and nested groups, each joined by an
 * AND/OR combinator segment, plus "add rule"/"add group" actions. The root
 * renders as a plain `<div>`; nested groups render as a labelled `<fieldset>`
 * with a hold-to-remove control. Memoized: the tree-edit helpers preserve the
 * identity of untouched subtrees, so an edit re-renders only the affected group.
 */
function QueryBuilderGroupImpl({ group, root, className }: QueryBuilderGroupProps) {
	const { disabled, allowGroups, requireRule } = useQueryBuilderState()

	const { updateCombinator, addRule, addGroup, remove } = useQueryBuilderActions()

	// With `requireRule`, a group keeps its last rule: the sole remaining rule
	// hides its remove control so the query can't be emptied.
	const rulesRemovable = !requireRule || group.children.length > 1

	// The focus ladder degrades to a group's "add" affordance; that is now the
	// menu trigger, the always-mounted control that replaced the bare "Add rule"
	// button. Registering it keeps focus from dropping to <body> when a group's
	// last rule is removed (WCAG 2.4.3).
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
			className={cn(k.group.base, !root && k.group.nested, className)}
		>
			<div className={k.group.base}>
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
								<QueryBuilderRule rule={child} removable={rulesRemovable} />
							)}
						</div>
					))
				)}
			</div>

			<Flex gap="sm" className={k.actions}>
				<Menu placement="bottom-start">
					<MenuTrigger>
						<Button
							ref={addRuleRef}
							variant="bare"
							suffix={<Icon icon={<ChevronDown />} />}
							disabled={disabled}
						>
							Add
						</Button>
					</MenuTrigger>
					<MenuContent>
						<MenuItem onAction={() => addRule(group.id)}>
							<Icon icon={<Plus />} />
							Add rule
						</MenuItem>
						{allowGroups && (
							<MenuItem onAction={() => addGroup(group.id)}>
								<Icon icon={<CopyPlus />} />
								Add group
							</MenuItem>
						)}
					</MenuContent>
				</Menu>
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
									className={k.remove}
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

/**
 * Renders one query group and its descendants. See {@link QueryBuilderGroupImpl}.
 * Memoized so a single edit re-renders only the touched group, not the whole tree.
 */
export const QueryBuilderGroup = memo(QueryBuilderGroupImpl)
