'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ugoki } from '../../recipes'
import { type JsonValueType, jsonValueColor } from '../../recipes/katachi/json-tree'
import { CopyButton } from '../copy-button'
import { Icon } from '../icon'
import { JsonTreeProvider, useJsonTreeContext } from './context'
import { k } from './variants'

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

type Path = (string | number)[]

const INDENT_REM = 1.25
const BASE_PAD_REM = 0.5

// ── JsonTree ───────────────────────────────────────────

export type JsonTreeProps = {
	/** The JSON value to render. */
	data: JsonValue
	/** Root label (renders as the root key). */
	rootKey?: string
	/** Nested levels open by default. Pass `Infinity` to expand everything. */
	defaultExpandDepth?: number
	/** Render a copy button on each node that copies its JSON path. */
	copyPath?: boolean
	/** Invoked when a node's path is copied. Receives the path segments. */
	onCopyPath?: (path: Path) => void
	className?: string
}

export function JsonTree({
	data,
	rootKey,
	defaultExpandDepth = 1,
	copyPath = false,
	onCopyPath,
	className,
}: JsonTreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
	})

	return (
		<JsonTreeProvider value={{ depth: 0, defaultExpandDepth, copyPath, onCopyPath }}>
			<div
				ref={ref}
				role="tree"
				data-slot="json-tree"
				className={cn(k.base, className)}
				onKeyDown={handleKeyDown}
			>
				<JsonNode keyName={rootKey} value={data} path={rootKey != null ? [rootKey] : []} />
			</div>
		</JsonTreeProvider>
	)
}

// ── JsonNode ───────────────────────────────────────────

type JsonNodeProps = {
	keyName?: string | number
	value: JsonValue
	path: Path
}

function JsonNode({ keyName, value, path }: JsonNodeProps) {
	const { depth, defaultExpandDepth, copyPath, onCopyPath } = useJsonTreeContext()
	const [open, setOpen] = useState(depth < defaultExpandDepth)

	const isArray = Array.isArray(value)
	const isObject = !isArray && typeof value === 'object' && value !== null
	const isBranch = isArray || isObject

	const entries = isBranch
		? isArray
			? (value as JsonValue[]).map((v, i) => [i, v] as const)
			: Object.entries(value as { [key: string]: JsonValue })
		: []

	const openBracket = isArray ? '[' : '{'
	const closeBracket = isArray ? ']' : '}'
	const count = entries.length
	const summary = count === 0 ? '' : count === 1 ? '1 item' : `${count} items`

	const paddingLeft = `${depth * INDENT_REM + BASE_PAD_REM}rem`
	const pathString = formatPath(path)
	const showCopy = copyPath && pathString.length > 0

	if (!isBranch) {
		return (
			<div className={cn(k.row)} style={{ paddingLeft }}>
				<div role="treeitem" tabIndex={-1} data-slot="json-node" className={cn(k.leaf)}>
					<span className={k.chevronSpacer} aria-hidden="true" />
					<NodeKey keyName={keyName} />
					<PrimitiveValue value={value} />
				</div>
				{showCopy && (
					<CopyButton
						value={pathString}
						size="xs"
						className={cn(k.copyAction)}
						onClickCapture={() => onCopyPath?.(path)}
					/>
				)}
			</div>
		)
	}

	const toggle = () => setOpen((prev) => !prev)

	return (
		<div data-slot="json-node">
			<div className={cn(k.row)} style={{ paddingLeft }}>
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
				{showCopy && (
					<CopyButton
						value={pathString}
						size="xs"
						className={cn(k.copyAction)}
						onClickCapture={() => onCopyPath?.(path)}
					/>
				)}
			</div>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div data-slot="json-group" {...ugoki.collapse.fade} className={k.group}>
						<JsonTreeProvider
							value={{
								depth: depth + 1,
								defaultExpandDepth,
								copyPath,
								onCopyPath,
							}}
						>
							{entries.map(([childKey, childValue]) => (
								<JsonNode
									key={String(childKey)}
									keyName={childKey}
									value={childValue}
									path={[...path, childKey]}
								/>
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
}

// ── Leaf helpers ───────────────────────────────────────

function NodeKey({ keyName }: { keyName?: string | number }) {
	if (keyName == null) return null

	if (typeof keyName === 'number') {
		return (
			<>
				<span className={cn(k.index)}>{keyName}</span>
				<span className={cn(k.punctuation)}>:</span>
			</>
		)
	}

	return (
		<>
			<span className={cn(k.key)}>{`"${keyName}"`}</span>
			<span className={cn(k.punctuation)}>:</span>
		</>
	)
}

function PrimitiveValue({ value }: { value: JsonValue }) {
	const type = valueType(value)
	const display = value === null ? 'null' : type === 'string' ? `"${value}"` : String(value)

	return <span className={cn(jsonValueColor[type])}>{display}</span>
}

function valueType(value: JsonValue): JsonValueType {
	if (value === null) return 'null'

	const t = typeof value

	if (t === 'string') return 'string'

	if (t === 'number') return 'number'

	return 'boolean'
}

function formatPath(path: Path) {
	if (path.length === 0) return ''

	return path.reduce<string>((acc, segment) => {
		if (typeof segment === 'number') return `${acc}[${segment}]`

		if (acc === '') return segment

		return `${acc}.${segment}`
	}, '')
}
