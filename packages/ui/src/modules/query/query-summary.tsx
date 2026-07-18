'use client'

import { Fragment } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/query-summary'
import { type QuerySummaryToken, summarizeQuery } from './engine/query-summary'
import type { QueryField, QueryGroup } from './engine/types'

/** Props for {@link QuerySummary}: the query `root` to describe and the `fields` resolving each rule's labels. */
export type QuerySummaryProps = {
	root: QueryGroup
	fields: QueryField[]
	className?: string
}

/** Renders one summary token: a muted combinator or bracket, or a rule as field · operator · value. @internal */
function SummaryToken({ token }: { token: QuerySummaryToken }) {
	if (token.kind === 'combinator') {
		return <span className={cn(k.combinator)}>{token.combinator === 'or' ? 'OR' : 'AND'}</span>
	}

	if (token.kind === 'group-open') return <span className={cn(k.bracket)}>(</span>

	if (token.kind === 'group-close') return <span className={cn(k.bracket)}>)</span>

	return (
		<span>
			<span className={cn(k.field)}>{token.field}</span>{' '}
			<span className={cn(k.operator)}>{token.operator}</span>
			{token.value != null && (
				<>
					{' '}
					<span className={cn(k.value)}>{token.value}</span>
				</>
			)}
		</span>
	)
}

/**
 * Read-only, human-readable rendering of a query tree: each active rule as
 * `field operator value`, joined by AND/OR and bracketed per nested group, over
 * the same `engine/` the builder edits. Renders `null` when the query imposes no
 * constraint (in step with {@link isQueryActive}), so it can sit beside a filter
 * affordance and appear only once a filter is set.
 *
 * @remarks
 * A blank or half-built rule drops out, mirroring the evaluator; a `select`
 * value shows its option label and a one-sided range a `≥`/`≤` bound. For a
 * plain string (a `title`, an aria-label, a log), reach for `formatQuerySummary`.
 */
export function QuerySummary({ root, fields, className }: QuerySummaryProps) {
	const tokens = summarizeQuery(root, fields)

	if (tokens.length === 0) return null

	return (
		<span data-slot="query-summary" className={cn(k.base, className)}>
			{tokens.map((token, index) => {
				const spaced =
					index > 0 && tokens[index - 1]?.kind !== 'group-open' && token.kind !== 'group-close'

				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: positional projection re-derived wholesale; the index is the token's stable identity
					<Fragment key={index}>
						{spaced && ' '}
						<SummaryToken token={token} />
					</Fragment>
				)
			})}
		</span>
	)
}
