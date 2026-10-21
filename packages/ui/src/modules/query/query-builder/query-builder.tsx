'use client'

import { useCallback, useMemo } from 'react'
import { Fieldset } from '../../../components/fieldset'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/query-builder'
import { adaptive, type Orientation, type Responsive } from '../../../types'
import type { QueryField, QueryGroup } from '../engine/types'
import type { QueryBuilderStateValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryBuilderGroup } from './query-builder-group'
import { useQueryBuilderTree } from './use-query-builder-tree'

/** The default `orientation` of a {@link QueryBuilder}: the parts of a rule stack on a compact viewport, and share a row from medium. */
export const QUERY_BUILDER_ORIENTATION = adaptive({
	compact: 'vertical',
	medium: 'horizontal',
}) satisfies Responsive<Orientation>

/** Props for {@link QueryBuilder}: the queryable `fields` and the controlled/uncontrolled query tree. */
export type QueryBuilderProps = {
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
	 * Keeps at least one rule in the query. A group's sole remaining rule hides its
	 * remove control, so the builder can't be emptied. For always-on filters (a
	 * column filter) that must keep a rule to edit.
	 * @defaultValue false
	 */
	requireRule?: boolean
	/**
	 * Lets the user reorder the children of each group, by drag or by keyboard.
	 * Each child shows a grip when its group has more than one child. A node
	 * moves only among its siblings, and each AND/OR stays in its position. A
	 * pointer drag calls `onValueChange` once, on the drop, and Escape cancels
	 * it. With the keyboard, each arrow key moves the node and calls
	 * `onValueChange`.
	 * @defaultValue false
	 */
	reorder?: boolean
	className?: string
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
}: QueryBuilderProps) {
	const { root, actions, register } = useQueryBuilderTree({
		fields,
		value,
		defaultValue,
		onValueChange,
	})

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
		<QueryBuilderProvider state={state} actions={actions} register={register}>
			<Fieldset data-slot="query-builder" disabled={disabled} className={cn(k().base, className)}>
				<QueryBuilderGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
