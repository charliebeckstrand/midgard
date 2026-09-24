'use client'

import { X } from 'lucide-react'
import {
	Fragment,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { announce, cn, dataAttr } from '../../core'
import { useA11yRoving } from '../../hooks'
import { k } from '../../recipes/kata/query-chips'
import {
	formatQuerySummary,
	type QuerySummaryRuleToken,
	type QuerySummaryToken,
	renderToken,
	spacedBefore,
	summarizeQuery,
} from './engine/query-summary'
import type { QueryField, QueryGroup } from './engine/types'
import { useQueryTree } from './use-query-tree'

/** Props for {@link QueryChips}: the queryable `fields` and the controlled/uncontrolled query tree. */
export type QueryChipsProps = {
	/** Fields that resolve each rule's labels, operators, and options. */
	fields: QueryField[]
	value?: QueryGroup
	defaultValue?: QueryGroup
	onValueChange?: (value: QueryGroup) => void
	/**
	 * Renders the chips with no controls: no remove button, and each combinator
	 * as text. A read-only row renders `null` when the query puts no constraint
	 * on the rows.
	 * @defaultValue false
	 */
	readOnly?: boolean
	/** Disables each remove button and each combinator switch. @defaultValue false */
	disabled?: boolean
	/** The accessible name of the row. @defaultValue 'Filters' */
	'aria-label'?: string
	/**
	 * The text of an interactive row when the query puts no constraint on the
	 * rows.
	 * @defaultValue 'No filters'
	 */
	emptyLabel?: ReactNode
	className?: string
}

/**
 * The controls that the row roves: each enabled remove button and combinator
 * switch. One `:is()` selector keeps document order in jsdom, as
 * `TOOLBAR_ITEM_SELECTOR` notes.
 *
 * @internal
 */
const ITEM_SELECTOR =
	':is(button[data-slot="query-chip-remove"], button[data-slot="query-chips-combinator"]):not(:disabled)'

/** Props for {@link QueryChip}. @internal */
type QueryChipProps = {
	token: QuerySummaryRuleToken
	/** Omit to render the chip with no remove button. */
	onRemove?: (token: QuerySummaryRuleToken) => void
	disabled: boolean
	register: (id: string, el: HTMLButtonElement | null) => void
}

/**
 * One active rule as a chip: field, operator, and value, and a remove button
 * when the row is interactive. Delete or Backspace on the button also removes
 * the rule, as on a `TagInput` chip.
 *
 * @internal
 */
function QueryChip({ token, onRemove, disabled, register }: QueryChipProps) {
	const { id } = token

	const ref = useCallback((el: HTMLButtonElement | null) => register(id, el), [register, id])

	const remove = () => onRemove?.(token)

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== 'Delete' && event.key !== 'Backspace') return

		event.preventDefault()

		remove()
	}

	return (
		<Badge
			data-slot="query-chip"
			variant="outline"
			radius="full"
			size="sm"
			className={cn(k.chip)}
			suffix={
				onRemove && (
					<Button
						ref={ref}
						type="button"
						variant="bare"
						size="xs"
						data-slot="query-chip-remove"
						aria-label={`Remove ${renderToken(token)}`}
						disabled={disabled}
						onClick={remove}
						onKeyDown={onKeyDown}
					>
						<Icon icon={<X />} />
					</Button>
				)
			}
		>
			<span className={cn(k.field)}>{token.field}</span>{' '}
			<span className={cn(k.operator)}>{token.operator}</span>
			{token.value != null && (
				<>
					{' '}
					<span className={cn(k.value)}>{token.value}</span>
				</>
			)}
		</Badge>
	)
}

/** Focus targets after a removal: rule ids, best first, then the row itself. @internal */
type PendingFocus = { ids: string[] }

/**
 * The rule ids that take focus after the rule `id` goes, best first: the
 * previous chips, nearest first, then the next chips. This is the ladder of the
 * builder's own removal (WCAG 2.4.3).
 *
 * @internal
 */
function focusLadder(tokens: QuerySummaryToken[], id: string): string[] {
	const ids = tokens.flatMap((token) => (token.kind === 'rule' ? [token.id] : []))

	const index = ids.indexOf(id)

	return [...ids.slice(0, index).reverse(), ...ids.slice(index + 1)]
}

/**
 * A row of chips over a query tree: each active rule as a chip, joined by its
 * AND/OR combinator and bracketed per nested group. It reads the same `engine/`
 * that the builder edits, and it is a filter bar over the active constraints.
 *
 * @remarks
 * An interactive row is a toolbar with one Tab stop, and the arrow keys move
 * across its controls. A chip's remove button removes its rule. A combinator
 * switches between AND and OR on a click. After a removal, focus moves to a
 * neighbour chip. After the last removal, focus moves to the row, which then
 * shows `emptyLabel`. The row is controlled or uncontrolled through
 * `value`/`onValueChange`. A blank or half-built rule has no chip, as in
 * `QuerySummary`.
 */
export function QueryChips({
	fields,
	value,
	defaultValue,
	onValueChange,
	readOnly = false,
	disabled = false,
	'aria-label': ariaLabel = 'Filters',
	emptyLabel = 'No filters',
	className,
}: QueryChipsProps) {
	const { root, actions } = useQueryTree({ fields, value, defaultValue, onValueChange })

	const tokens = summarizeQuery(root, fields)

	const rowRef = useRef<HTMLDivElement>(null)

	const descriptionId = useId()

	// One Tab stop, and the arrow keys move across the controls. A read-only row
	// has no control to rove.
	const onKeyDown = useA11yRoving(rowRef, {
		itemSelector: ITEM_SELECTOR,
		orientation: 'horizontal',
		manageTabIndex: true,
		enabled: !readOnly,
	})

	// Each remove button registers here by rule id. A removal stashes its focus
	// ladder, and the effect moves focus after the chip unmounts.
	const removers = useRef(new Map<string, HTMLButtonElement>())

	const register = useCallback((id: string, el: HTMLButtonElement | null) => {
		if (el) removers.current.set(id, el)
		else removers.current.delete(id)
	}, [])

	const [pendingFocus, setPendingFocus] = useState<PendingFocus | null>(null)

	useEffect(() => {
		if (!pendingFocus) return

		for (const id of pendingFocus.ids) {
			const el = removers.current.get(id)

			if (el?.isConnected && !el.disabled) {
				el.focus()

				return
			}
		}

		// No chip is left, so the row takes focus with its empty text.
		rowRef.current?.focus()
	}, [pendingFocus])

	const remove = (token: QuerySummaryRuleToken) => {
		setPendingFocus({ ids: focusLadder(tokens, token.id) })

		actions.remove(token.id)

		announce(`Removed ${renderToken(token)}`)
	}

	if (readOnly && tokens.length === 0) return null

	const renderPart = (token: QuerySummaryToken) => {
		if (token.kind === 'rule') {
			return (
				<QueryChip
					token={token}
					onRemove={readOnly ? undefined : remove}
					disabled={disabled}
					register={register}
				/>
			)
		}

		if (token.kind === 'group-open' || token.kind === 'group-close') {
			return <span className={cn(k.bracket)}>{token.kind === 'group-open' ? '(' : ')'}</span>
		}

		if (readOnly) return <span className={cn(k.combinator)}>{token.label}</span>

		const next = token.combinator === 'and' ? 'OR' : 'AND'

		return (
			<Button
				type="button"
				variant="bare"
				size="xs"
				data-slot="query-chips-combinator"
				aria-label={`${token.label}, switch to ${next}`}
				disabled={disabled}
				className={cn(k.combinator)}
				onClick={() => {
					actions.updateCombinator(token.id, token.combinator === 'and' ? 'or' : 'and')

					announce(`Changed ${token.label} to ${next}`)
				}}
			>
				{token.label}
			</Button>
		)
	}

	// A token keys by its kind and its node, so a control keeps its element, and
	// its focus, across an edit. A space between tokens keeps the text a
	// sentence, as `QuerySummary` spaces it; the flex row ignores the space.
	const body = tokens.map((token, index) => (
		<Fragment key={`${token.kind}:${token.id}`}>
			{spacedBefore(tokens[index - 1], token) && ' '}
			{renderPart(token)}
		</Fragment>
	))

	if (readOnly) {
		return (
			// biome-ignore lint/a11y/useSemanticElements: a <fieldset> gives form-field semantics to a row of text. A named role="group" is the correct grouping here
			<div
				data-slot="query-chips"
				data-readonly=""
				role="group"
				aria-label={ariaLabel}
				className={cn(k.base, className)}
			>
				{body}
			</div>
		)
	}

	const empty = tokens.length === 0

	return (
		<div
			ref={rowRef}
			data-slot="query-chips"
			data-empty={dataAttr(empty)}
			role="toolbar"
			aria-orientation="horizontal"
			aria-label={ariaLabel}
			aria-describedby={empty ? undefined : descriptionId}
			// The row takes focus only when its last chip goes; it is never a Tab stop.
			tabIndex={empty ? -1 : undefined}
			className={cn(k.base, className)}
			onKeyDown={onKeyDown}
		>
			{empty ? <span className={cn(k.empty)}>{emptyLabel}</span> : body}
			{/* The full sentence keeps the brackets for assistive technology, which
			    hears only the focused control inside the toolbar. */}
			<span id={descriptionId} hidden>
				{formatQuerySummary(root, fields)}
			</span>
		</div>
	)
}
