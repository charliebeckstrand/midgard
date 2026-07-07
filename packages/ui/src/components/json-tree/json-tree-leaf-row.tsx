import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { INDENT_REM } from './json-tree-constants'
import { NodeKey, PrimitiveValue } from './json-tree-utilities'
import type { JsonValue } from './types'

type JsonTreeLeafRowProps = {
	depth: number
	keyName?: string | number
	value: JsonValue
	highlighted: boolean
	/** Carries the tree's single Tab stop. Defaults to the root row; the virtualized variant passes the first rendered row instead. */
	tabbable?: boolean
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
}: JsonTreeLeafRowProps) {
	const paddingLeft = `${depth * INDENT_REM}rem`

	return (
		<div data-highlighted={dataAttr(highlighted)}>
			<div className={cn(k.row)} style={{ paddingLeft }}>
				<div
					role="treeitem"
					aria-level={depth + 1}
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
