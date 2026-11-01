import { k } from '../../recipes/kata/json-tree'

/**
 * Renders a node's key prefix (a numeric array index or a quoted object key) followed by the `:` separator; nothing for the root (`keyName == null`).
 * An object key is a JSON string literal, so a quote or a newline in the key shows as an escape.
 *
 * @internal
 */
export function JsonTreeNodeKey({ keyName }: { keyName?: string | number }) {
	if (keyName == null) return null

	if (typeof keyName === 'number') {
		return (
			<>
				<span className={k().index}>{keyName}</span>
				<span className={k().punctuation}>:</span>
			</>
		)
	}

	return (
		<>
			<span className={k({ type: 'key' }).value} translate="no">
				{JSON.stringify(keyName)}
			</span>
			<span className={k().punctuation}>:</span>
		</>
	)
}
