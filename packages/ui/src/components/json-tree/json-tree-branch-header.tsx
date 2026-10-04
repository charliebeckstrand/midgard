import { ChevronRight } from 'lucide-react'
import { type KeyboardEvent, useId } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { Icon } from '../icon'
import { branchToggleKey } from './json-tree-keyboard'
import { type FlatSetPosition, NodeKey } from './json-tree-utilities'

type JsonTreeBranchHeaderProps = {
	depth: number
	keyName?: string | number
	isArray: boolean
	open: boolean
	count: number
	highlighted: boolean
	/** Carries the tree's single Tab stop. Defaults to the root row, until roving moves the stop in the recursive variant; the virtualized variant passes the first rendered row instead. */
	tabbable?: boolean
	/** The id of the child group, which the open row owns. The virtualized variant has no group and omits it. */
	groupId?: string
	onToggle: () => void
} & Partial<FlatSetPosition>

/**
 * Branch row for a {@link JsonTree}: a `role="treeitem"` toggle button showing
 * the key, the open/close bracket, and — while collapsed — an item-count
 * summary. Shared by the recursive {@link JsonTreeNode} and the virtualized
 * {@link JsonTreeNodeRow}. The row takes its name from its own content through
 * `aria-labelledby`. In the recursive variant, the child group is a sibling of
 * the row, so the open row owns it through `aria-owns`.
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
	groupId,
	onToggle,
}: JsonTreeBranchHeaderProps) {
	const contentId = useId()

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
				// The group is a sibling of the row, so the row owns it. The group is in the
				// DOM while the row is open, so the reference never dangles.
				aria-owns={groupId && open ? groupId : undefined}
				// The content of the row names it, so the text of the owned group stays out.
				aria-labelledby={contentId}
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
				<span className={cn(k.chevron.base)} aria-hidden="true">
					<Icon
						icon={<ChevronRight />}
						size="sm"
						className={cn('rtl:-scale-x-100', open && 'rotate-90 rtl:-rotate-90')}
					/>
				</span>
				<span id={contentId} className={cn(k.content, highlighted && k.highlight)}>
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
