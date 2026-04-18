'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useMemo, useState } from 'react'
import { cn } from '../../core'
import { ugoki } from '../../recipes'
import { Icon } from '../icon'
import { JsonTreeProvider, useJsonTreeContext } from './context'
import { NodeKey, PrimitiveValue } from './helpers'
import {
	BASE_PAD_REM,
	filterEntries,
	getEntries,
	INDENT_REM,
	isBranch,
	type JsonValue,
	matchesSearch,
} from './utilities'
import { k } from './variants'

type JsonNodeProps = {
	keyName?: string | number
	value: JsonValue
}

export const JsonNode = memo(function JsonNode({ keyName, value }: JsonNodeProps) {
	const {
		depth,
		defaultExpandDepth,
		search,
		filter,
		searchIndex,
		path,
		expanded,
		onExpandedChange,
	} = useJsonTreeContext()

	const nodePath = path ? `${path}.${keyName ?? '$'}` : String(keyName ?? '$')

	const controlled = expanded !== undefined

	const branch = isBranch(value)

	const entries = getEntries(value)

	const highlighted = matchesSearch(keyName, value, search)

	const hasMatch = branch && search ? searchIndex.get(value as object) === true : false

	const [localOpen, setLocalOpen] = useState(depth < defaultExpandDepth)

	const open = controlled ? expanded.has(nodePath) : localOpen

	const visibleEntries = useMemo(
		() => (filter && search ? filterEntries(entries, search, searchIndex) : entries),
		[entries, filter, search, searchIndex],
	)

	const empty = visibleEntries.length === 0

	const childContextValue = useMemo(
		() => ({
			depth: depth + 1,
			defaultExpandDepth,
			search,
			filter,
			searchIndex,
			path: nodePath,
			expanded,
			onExpandedChange,
		}),
		[depth, defaultExpandDepth, search, filter, searchIndex, nodePath, expanded, onExpandedChange],
	)

	useEffect(() => {
		if (controlled) return

		if (!search) {
			setLocalOpen(depth < defaultExpandDepth)

			return
		}

		if (hasMatch && !empty) setLocalOpen(true)

		if (filter && empty) setLocalOpen(false)
	}, [search, hasMatch, filter, empty, depth, defaultExpandDepth, controlled])

	if (filter && search && !branch && !highlighted) return null

	const isArray = Array.isArray(value)

	const openBracket = isArray ? '[' : '{'
	const closeBracket = isArray ? ']' : '}'

	const count = visibleEntries.length

	const summary = count === 0 ? '' : count === 1 ? '1 item' : `${count} items`

	const paddingLeft = `${depth * INDENT_REM + BASE_PAD_REM}rem`

	if (!branch) {
		return (
			<div data-highlighted={highlighted || undefined}>
				<div className={cn(k.row, highlighted && k.highlight)} style={{ paddingLeft }}>
					<div role="treeitem" tabIndex={-1} data-slot="json-node" className={cn(k.leaf)}>
						<span className={k.chevronSpacer} aria-hidden="true" />
						<NodeKey keyName={keyName} />
						<PrimitiveValue value={value} />
					</div>
				</div>
			</div>
		)
	}

	const toggle = () => {
		if (controlled && onExpandedChange) {
			const next = new Set(expanded)

			if (next.has(nodePath)) next.delete(nodePath)
			else next.add(nodePath)

			onExpandedChange(next)
		} else {
			setLocalOpen((prev) => !prev)
		}
	}

	return (
		<div data-slot="json-node" data-highlighted={highlighted || undefined}>
			<div className={cn(k.row, highlighted && k.highlight)} style={{ paddingLeft }}>
				<button
					type="button"
					role="treeitem"
					aria-expanded={open}
					aria-level={depth + 1}
					tabIndex={-1}
					data-slot="json-node-toggle"
					data-open={open || undefined}
					className={cn(k.toggle)}
					onClick={toggle}
				>
					<span className={cn(k.chevron)} aria-hidden="true">
						<Icon icon={<ChevronRight />} size="sm" className={cn(open && 'rotate-90')} />
					</span>
					<NodeKey keyName={keyName} />
					<span className={cn(k.punctuation)}>{openBracket}</span>
					{!open && count > 0 && (
						<>
							<span className={cn(k.summary)}>{summary}</span>
							<span className={cn(k.punctuation)}>{closeBracket}</span>
						</>
					)}
					{!open && count === 0 && <span className={cn(k.punctuation)}>{closeBracket}</span>}
				</button>
			</div>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div data-slot="json-group" {...ugoki.collapse.fade} className={k.group}>
						<JsonTreeProvider value={childContextValue}>
							{visibleEntries.map(([childKey, childValue]) => (
								<JsonNode key={String(childKey)} keyName={childKey} value={childValue} />
							))}
						</JsonTreeProvider>
						<div
							data-slot="json-close"
							className={cn(k.row, k.punctuation)}
							style={{ paddingLeft }}
						>
							<span className={k.chevronSpacer} aria-hidden="true" />
							{closeBracket}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
})
