'use client'

import { type ComponentProps, useCallback, useMemo, useState } from 'react'
import { Fieldset } from '../../../components/fieldset'
import { cn } from '../../../core/cn'
import { useStableEvent } from '../../../hooks/use-stable-event'
import { k } from '../../../recipes/kata/query-builder'
import type { Orientation } from '../../../types/orientation'
import { adaptive, type Responsive } from '../../../utilities/responsive'
import type { QueryField, QueryGroup } from '../engine/types'
import type { QueryBuilderStateValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryBuilderGroup } from './query-builder-group'
import { createQueryMove } from './query-builder-move'
import { useQueryBuilderTree } from './use-query-builder-tree'

/** The slots of the query builder. */
const slots = k()

/** The default `orientation` of a {@link QueryBuilder}: the parts of a rule stack on a compact viewport, and share a row from medium. */
export const QUERY_BUILDER_ORIENTATION = adaptive({
	compact: 'vertical',
	medium: 'horizontal',
}) satisfies Responsive<Orientation>

/**
 * Props for {@link QueryBuilder}: the queryable `fields` and the controlled/uncontrolled query tree.
 * The root `<fieldset>` takes the rest. The builder writes its groups itself, so it takes no
 * `children`. `defaultValue` holds a query tree.
 */
export type QueryBuilderProps = Omit<ComponentProps<'fieldset'>, 'children' | 'defaultValue'> & {
	/** Fields available to rules, each with a type and operator set. */
	fields: QueryField[]
	/** Controlled query tree. Pair it with `onValueChange`. */
	value?: QueryGroup
	/** Initial query tree when uncontrolled. Omitted, the tree starts as an empty `and` group. */
	defaultValue?: QueryGroup
	/** Fires when an edit changes the query, with the next query tree. */
	onValueChange?: (value: QueryGroup) => void
	/** Disables every control in the tree. @defaultValue false */
	disabled?: boolean
	/**
	 * Allows nested groups via an "Add group" action. Set `false` for a flat list
	 * of rules joined by AND/OR.
	 * @defaultValue true
	 */
	allowGroups?: boolean
	/**
	 * Hides the field selector of each rule, for a single fixed field such as a
	 * column-scoped filter. Supply that one field in `fields`.
	 * @defaultValue false
	 */
	hideFieldSelector?: boolean
	/**
	 * The axis of the field, the operator, and the value of each rule:
	 * `vertical` stacks them at full width, and `horizontal` puts them in a row
	 * that wraps a part that cannot get its minimum width. A per-breakpoint map
	 * sets the axis from each breakpoint, mobile-first. A single value sets it at
	 * each width.
	 * @defaultValue {@link QUERY_BUILDER_ORIENTATION}
	 */
	orientation?: Responsive<Orientation>
	/**
	 * Keeps at least one rule in a query that has one. A group's sole remaining rule hides its
	 * remove control, so the builder can't be emptied. For always-on filters (a
	 * column filter) that must keep a rule to edit. The prop adds no rule, so an
	 * empty tree stays empty. Seed the first rule in `value` or `defaultValue`,
	 * as the grid column filter does.
	 * @defaultValue false
	 */
	requireRule?: boolean
	/**
	 * Lets the user move the nodes of the query, by drag or by keyboard, among
	 * their siblings and from one group into another. Each child shows a grip
	 * when it can move: its group has more than one child, or the group is
	 * nested and the child can leave it. In its own group a node moves between
	 * the AND/OR separators, which stay in their positions. A node that moves
	 * into another group takes the combinator of the place that it enters, and
	 * each other node keeps its combinator. A pointer drag over another group
	 * drops the node there, at the height of the pointer. With the keyboard,
	 * Space lifts the node, the up and down arrows move it among its siblings,
	 * the arrow toward the end of the line moves it into the group next to it,
	 * and the arrow toward the start of the line moves it out of its group. A
	 * pointer drag calls `onValueChange` once, on the drop, and Escape cancels
	 * it. With the keyboard, each arrow key moves the node and calls
	 * `onValueChange`. Under `requireRule`, the sole node of a group does not
	 * leave it.
	 * @defaultValue false
	 */
	reorder?: boolean
}

/**
 * Nested group/rule editor for boolean queries. Produces a tree of `and`/`or`
 * groups over typed field rules, controlled or uncontrolled through
 * `value`/`onValueChange`. It supplies field config and tree-edit actions to
 * its descendants via context.
 */
export function QueryBuilder({
	fields,
	value,
	defaultValue,
	onValueChange,
	disabled = false,
	allowGroups = true,
	hideFieldSelector = false,
	orientation = QUERY_BUILDER_ORIENTATION,
	requireRule = false,
	reorder = false,
	className,
	...props
}: QueryBuilderProps) {
	const { root, actions, register } = useQueryBuilderTree({
		fields,
		value,
		defaultValue,
		onValueChange,
	})

	const getRoot = useStableEvent(() => root)

	const [move] = useState(() => createQueryMove(getRoot))

	const getField = useCallback(
		(name: string) => fields.find((field) => field.name === name),
		[fields],
	)

	const state = useMemo<QueryBuilderStateValue>(
		() => ({
			fields,
			getField,
			disabled,
			allowGroups,
			hideFieldSelector,
			orientation,
			requireRule,
			reorderable: reorder,
		}),
		[fields, getField, disabled, allowGroups, hideFieldSelector, orientation, requireRule, reorder],
	)

	return (
		<QueryBuilderProvider state={state} actions={actions} register={register} move={move}>
			<Fieldset
				data-slot="query-builder"
				{...props}
				disabled={disabled}
				className={cn(slots.base, className)}
			>
				<QueryBuilderGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
