import { ChevronRight } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { Icon } from '../icon'
import { branchToggleKey } from './json-tree-keyboard'
import { NodeKey } from './json-tree-utilities'

type JsonTreeBranchHeaderProps = {
	depth: number
	keyName?: string | number
	isArray: boolean
	open: boolean
	count: number
	highlighted: boolean
	/** Carries the tree's single Tab stop. Defaults to the root row; the virtualized variant passes the first rendered row instead. */
	tabbable?: boolean
	/** The sibling count for `aria-setsize`. The virtualized variant gives it, because windowing keeps most siblings out of the DOM. */
	setSize?: number
	/** The 1-based sibling position for `aria-posinset`. The virtualized variant gives it with `setSize`. */
	posInSet?: number
	onToggle: () => void
}

/**
 * Branch row for a {@link JsonTree}: a `role="treeitem"` toggle button showing
 * the key, the open/close bracket, and — while collapsed — an item-count
 * summary. Shared by the recursive {@link JsonTreeNode} and the virtualized
 * {@link JsonTreeNodeRow}.
 *
 * @internal
 */
export function JsonTreeBranchHeader({
	depth,
	keyName,
	isArray,
	open,
	count,
	highlighted,
	tabbable,
	setSize,
	posInSet,
	onToggle,
}: JsonTreeBranchHeaderProps) {
	const openBracket = isArray ? '[' : '{'
	const closeBracket = isArray ? ']' : '}'

	const summary = count === 0 ? '' : count === 1 ? '1 item' : `${count} items`

	// The row opens on the arrow toward its children and closes on the arrow
	// back. The tree moves focus on the other two cases.
	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (!branchToggleKey(event, open)) return

		event.preventDefault()

		onToggle()
	}

	return (
		<div className={cn(k.row)}>
			<button
				type="button"
				role="treeitem"
				aria-expanded={open}
				aria-level={depth + 1}
				aria-setsize={setSize}
				aria-posinset={posInSet}
				tabIndex={(tabbable ?? depth === 0) ? 0 : -1}
				data-slot="json-node-toggle"
				data-open={dataAttr(open)}
				className={cn(k.toggle)}
				onClick={onToggle}
				onKeyDown={handleKeyDown}
			>
				<span className={cn(k.chevron.icon)} aria-hidden="true">
					<Icon
						icon={<ChevronRight />}
						size="sm"
						className={cn('rtl:-scale-x-100', open && 'rotate-90 rtl:-rotate-90')}
					/>
				</span>
				<span className={cn(k.content, highlighted && k.highlight)}>
					<NodeKey keyName={keyName} />
					<span className={cn(k.punctuation)}>{openBracket}</span>
					{!open && (
						<>
							{count > 0 && <span className={cn(k.summary)}>{summary}</span>}
							<span className={cn(k.punctuation)}>{closeBracket}</span>
						</>
					)}
				</span>
			</button>
		</div>
	)
}
