import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { NodeKey, PrimitiveValue } from './json-tree-utilities'
import type { JsonValue } from './types'

type JsonTreeLeafRowProps = {
	depth: number
	keyName?: string | number
	value: JsonValue
	highlighted: boolean
	/** Carries the tree's single Tab stop. Defaults to the root row; the virtualized variant passes the first rendered row instead. */
	tabbable?: boolean
	/** The sibling count for `aria-setsize`. The virtualized variant gives it, because windowing keeps most siblings out of the DOM. */
	setSize?: number
	/** The 1-based sibling position for `aria-posinset`. The virtualized variant gives it with `setSize`. */
	posInSet?: number
}

/**
 * Leaf row for a {@link JsonTree}: a non-expandable `role="treeitem"` showing a
 * key and its scalar value. Shared by the recursive {@link JsonTreeNode} and the
 * virtualized {@link JsonTreeNodeRow}.
 *
 * @internal
 */
export function JsonTreeLeafRow({
	depth,
	keyName,
	value,
	highlighted,
	tabbable,
	setSize,
	posInSet,
}: JsonTreeLeafRowProps) {
	return (
		<div data-highlighted={dataAttr(highlighted)}>
			<div className={cn(k.row)}>
				<div
					role="treeitem"
					aria-level={depth + 1}
					aria-setsize={setSize}
					aria-posinset={posInSet}
					tabIndex={(tabbable ?? depth === 0) ? 0 : -1}
					data-slot="json-node"
					className={cn(k.leaf)}
				>
					<span className={k.chevron.spacer} aria-hidden="true" />
					<span className={cn(k.content, highlighted && k.highlight)}>
						<NodeKey keyName={keyName} />
						<PrimitiveValue value={value} />
					</span>
				</div>
			</div>
		</div>
	)
}
