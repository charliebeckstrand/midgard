'use client'

import { ChevronDown, CopyPlus, Plus } from 'lucide-react'
import { memo } from 'react'
import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import { HoldButton } from '../../../components/hold-button'
import { Icon } from '../../../components/icon'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { Segment, SegmentControl, SegmentItem } from '../../../components/segment'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core'
import { useIntl } from '../../../primitives/intl/use-intl'
import { k } from '../../../recipes/kata/query-builder'
import { Flex } from '../../../structure/flex'
import { queryMessages } from '../engine/query-messages'
import type { QueryCombinator, QueryGroup, QueryNode } from '../engine/types'
import { useFocusableRef, useQueryBuilderActions, useQueryBuilderState } from './context'
import { focusKeys } from './query-builder-focus'
import { queryBuilderMessages } from './query-builder-messages'
import { QueryBuilderRule } from './query-builder-rule'
import { QueryBuilderSortable } from './query-builder-sortable'

/** The slots of the query builder. */
const slots = k()

/** Props for {@link QueryBuilderGroup}: the group node to render and whether it is the tree root. @internal */
export type QueryBuilderGroupProps = {
	/** The group node to render, with its child rules and groups. */
	group: QueryGroup
	/**
	 * When true, the group is the root and omits its "remove" button.
	 * @defaultValue false
	 */
	root?: boolean
	/**
	 * When false, the group omits its "remove" button. The parent sets it under
	 * `requireRule` when the group is its sole child.
	 * @defaultValue true
	 */
	removable?: boolean
	className?: string
}

/** Props for {@link QueryBuilderSeparator}. @internal */
type QueryBuilderSeparatorProps = {
	/** The id of the node after the separator, which holds the combinator. */
	id: string
	combinator: QueryCombinator
}

/**
 * The AND/OR segment before a child of a group. The segment is a density scope
 * one step below the scope around it, so it stays one step below the controls
 * of the rules.
 *
 * @remarks It is memoized on primitive props. An edit renders the group of the
 * edited node, and without the memo each separator of the group rendered its
 * segment again. In a group of 128 rules, that was most of the cost of a
 * keystroke.
 *
 * @internal
 */
const QueryBuilderSeparator = memo(function QueryBuilderSeparator({
	id,
	combinator,
}: QueryBuilderSeparatorProps) {
	const { updateCombinator } = useQueryBuilderActions()

	const intl = useIntl()

	return (
		<div data-density="slot">
			<Segment
				value={combinator}
				onValueChange={(next) => next && updateCombinator(id, next as QueryCombinator)}
			>
				<SegmentControl aria-label={intl.formatMessage(queryBuilderMessages.combinator)}>
					<SegmentItem value="and">{intl.formatMessage(queryMessages.and)}</SegmentItem>
					<SegmentItem value="or">{intl.formatMessage(queryMessages.or)}</SegmentItem>
				</SegmentControl>
			</Segment>
		</div>
	)
})

/**
 * Renders one query group: its child rules and nested groups, each joined by an
 * AND/OR combinator segment, plus "add rule"/"add group" actions. The root
 * renders as a plain `<div>`; nested groups render as a labeled `<fieldset>`
 * with a hold-to-remove control. Memoized: the tree-edit helpers preserve the
 * identity of untouched subtrees, so an edit re-renders only the affected group.
 */
function QueryBuilderGroupImpl({
	group,
	root,
	removable = true,
	className,
}: QueryBuilderGroupProps) {
	const { disabled, allowGroups, requireRule, reorderable } = useQueryBuilderState()

	const { addRule, addGroup, remove } = useQueryBuilderActions()

	const intl = useIntl()

	// With `requireRule`, a group keeps its last child: the sole child, a rule or
	// a group, hides its remove control. A new group starts with a rule, so each
	// group then holds a rule, and the query can't be emptied.
	const childRemovable = !requireRule || group.children.length > 1

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

	const node = (child: QueryNode) =>
		child.type === 'group' ? (
			<QueryBuilderGroup group={child} removable={childRemovable} />
		) : (
			<QueryBuilderRule rule={child} removable={childRemovable} />
		)

	// The AND/OR before the child at the index.
	const separator = (index: number) => {
		const child = group.children[index]

		if (index === 0 || child === undefined) return null

		return <QueryBuilderSeparator id={child.id} combinator={child.combinator ?? 'and'} />
	}

	return (
		<Wrapper
			data-slot="query-group"
			data-combinator={group.combinator}
			aria-label={root ? undefined : intl.formatMessage(queryBuilderMessages.group)}
			className={cn(k({ nested: !root }).group, className)}
		>
			<div className={slots.group}>
				{group.children.length === 0 ? (
					<Alert
						severity="warning"
						variant="soft"
						title={intl.formatMessage(queryBuilderMessages.noRules)}
						className="w-full"
					/>
				) : reorderable ? (
					<QueryBuilderSortable group={group} separator={separator} node={node} />
				) : (
					group.children.map((child, index) => (
						<div key={child.id} className={slots.group}>
							{separator(index)}
							{node(child)}
						</div>
					))
				)}
			</div>

			<Flex gap="sm" className={slots.actions}>
				<Menu placement="bottom-start">
					<MenuTrigger>
						<Button
							type="button"
							ref={addRuleRef}
							variant="bare"
							suffix={<Icon icon={<ChevronDown />} />}
							disabled={disabled}
						>
							{intl.formatMessage(queryBuilderMessages.add)}
						</Button>
					</MenuTrigger>
					<MenuContent>
						<MenuItem onAction={() => addRule(group.id)}>
							<Icon icon={<Plus />} />
							{intl.formatMessage(queryBuilderMessages.addRule)}
						</MenuItem>
						{allowGroups && (
							<MenuItem onAction={() => addGroup(group.id)}>
								<Icon icon={<CopyPlus />} />
								{intl.formatMessage(queryBuilderMessages.addGroup)}
							</MenuItem>
						)}
					</MenuContent>
				</Menu>
				{!root && removable && (
					<Flex justify="end">
						<Tooltip>
							<TooltipTrigger>
								<HoldButton
									ref={removeRef}
									variant="soft"
									color="red"
									aria-label={intl.formatMessage(queryBuilderMessages.removeGroup)}
									disabled={disabled}
									className={slots.remove}
									onHoldComplete={() => remove(group.id)}
								>
									{intl.formatMessage(queryBuilderMessages.removeGroup)}
								</HoldButton>
							</TooltipTrigger>
							<TooltipContent>
								{intl.formatMessage(queryBuilderMessages.holdToRemoveGroup)}
							</TooltipContent>
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
 *
 * @internal
 */
export const QueryBuilderGroup = memo(QueryBuilderGroupImpl)
