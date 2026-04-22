'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '../../core'
import { Icon } from '../icon'
import { NodeKey, PrimitiveValue } from './helpers'
import { type FlatNode, INDENT_REM } from './utilities'
import { k } from './variants'

export type JsonNodeRowProps = {
	node: FlatNode
	onToggle: (path: string) => void
}

/**
 * Flat, non-recursive renderer for a single row in the virtualized JsonTree.
 * Shares visual slots (`json-node`, `json-node-toggle`, `json-close`) and
 * classes with the recursive JsonNode so styling, tests, and recipe lookups
 * stay aligned.
 */
export function JsonNodeRow({ node, onToggle }: JsonNodeRowProps) {
	const paddingLeft = `${node.depth * INDENT_REM}rem`

	if (node.kind === 'leaf') {
		return (
			<div data-highlighted={node.highlighted || undefined}>
				<div className={cn(k.row, node.highlighted && k.highlight)} style={{ paddingLeft }}>
					<div
						role="treeitem"
						tabIndex={node.depth === 0 ? 0 : -1}
						data-slot="json-node"
						className={cn(k.leaf)}
					>
						<span className={k.chevronSpacer} aria-hidden="true" />
						<NodeKey keyName={node.keyName} />
						<PrimitiveValue value={node.value} />
					</div>
				</div>
			</div>
		)
	}

	if (node.kind === 'branch-close') {
		const isArray = Array.isArray(node.value)

		return (
			<div data-slot="json-close" className={cn(k.row, k.punctuation)} style={{ paddingLeft }}>
				<span className={k.chevronSpacer} aria-hidden="true" />
				{isArray ? ']' : '}'}
			</div>
		)
	}

	const isArray = Array.isArray(node.value)
	const openBracket = isArray ? '[' : '{'
	const closeBracket = isArray ? ']' : '}'

	const summary = node.count === 0 ? '' : node.count === 1 ? '1 item' : `${node.count} items`

	return (
		<div data-slot="json-node" data-highlighted={node.highlighted || undefined}>
			<div className={cn(k.row, node.highlighted && k.highlight)} style={{ paddingLeft }}>
				<button
					type="button"
					role="treeitem"
					aria-expanded={node.open}
					aria-level={node.depth + 1}
					tabIndex={node.depth === 0 ? 0 : -1}
					data-slot="json-node-toggle"
					data-open={node.open || undefined}
					className={cn(k.toggle)}
					onClick={() => onToggle(node.path)}
				>
					<span className={cn(k.chevron)} aria-hidden="true">
						<Icon icon={<ChevronRight />} size="sm" className={cn(node.open && 'rotate-90')} />
					</span>
					<NodeKey keyName={node.keyName} />
					<span className={cn(k.punctuation)}>{openBracket}</span>
					{!node.open && node.count > 0 && (
						<>
							<span className={cn(k.summary)}>{summary}</span>
							<span className={cn(k.punctuation)}>{closeBracket}</span>
						</>
					)}
					{!node.open && node.count === 0 && (
						<span className={cn(k.punctuation)}>{closeBracket}</span>
					)}
				</button>
			</div>
		</div>
	)
}
