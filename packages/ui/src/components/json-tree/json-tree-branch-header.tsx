import { ChevronRight } from 'lucide-react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { Icon } from '../icon'
import { NodeKey } from './json-tree-helpers'
import { INDENT_REM } from './json-tree-utilities'

export type JsonTreeBranchHeaderProps = {
	depth: number
	keyName?: string | number
	isArray: boolean
	open: boolean
	count: number
	highlighted: boolean
	onToggle: () => void
}

export function JsonTreeBranchHeader({
	depth,
	keyName,
	isArray,
	open,
	count,
	highlighted,
	onToggle,
}: JsonTreeBranchHeaderProps) {
	const paddingLeft = `${depth * INDENT_REM}rem`

	const openBracket = isArray ? '[' : '{'
	const closeBracket = isArray ? ']' : '}'

	const summary = count === 0 ? '' : count === 1 ? '1 item' : `${count} items`

	return (
		<div className={cn(k.row)} style={{ paddingLeft }}>
			<button
				type="button"
				role="treeitem"
				aria-expanded={open}
				aria-level={depth + 1}
				tabIndex={depth === 0 ? 0 : -1}
				data-slot="json-node-toggle"
				data-open={open || undefined}
				className={cn(k.toggle)}
				onClick={onToggle}
			>
				<span className={cn(k.chevron)} aria-hidden="true">
					<Icon icon={<ChevronRight />} size="sm" className={cn(open && 'rotate-90')} />
				</span>
				<span className={cn(k.content, highlighted && k.highlight)}>
					<NodeKey keyName={keyName} />
					<span className={cn(k.punctuation)}>{openBracket}</span>
					{!open && count > 0 && (
						<>
							<span className={cn(k.summary)}>{summary}</span>
							<span className={cn(k.punctuation)}>{closeBracket}</span>
						</>
					)}
					{!open && count === 0 && <span className={cn(k.punctuation)}>{closeBracket}</span>}
				</span>
			</button>
		</div>
	)
}
