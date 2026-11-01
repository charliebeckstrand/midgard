import { dataAttr } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { JsonTreeNodeKey } from './json-tree-node-key'
import { JsonTreePrimitiveValue } from './json-tree-primitive-value'
import type { FlatSetPosition } from './json-tree-utilities'
import type { JsonValue } from './types'

type JsonTreeLeafRowProps = {
	depth: number
	keyName?: string | number
	value: JsonValue
	highlighted: boolean
	/** Carries the tree's single Tab stop. Defaults to the root row, until roving moves the stop in the recursive variant; the virtualized variant passes the first rendered row instead. */
	tabbable?: boolean
} & Partial<FlatSetPosition>

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
			<div className={k().row}>
				<div
					role="treeitem"
					aria-level={depth + 1}
					aria-setsize={setSize}
					aria-posinset={posInSet}
					tabIndex={(tabbable ?? depth === 0) ? 0 : -1}
					data-slot="json-node"
					className={k().leaf}
				>
					<span className={k().chevron.spacer} aria-hidden="true" />
					<span className={k({ highlighted }).content}>
						<JsonTreeNodeKey keyName={keyName} />
						<JsonTreePrimitiveValue value={value} />
					</span>
				</div>
			</div>
		</div>
	)
}
