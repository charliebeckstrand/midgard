import { k } from '../../recipes/kata/json-tree'
import { valueType } from './json-tree-utilities'
import type { JsonValue } from './types'

/**
 * Renders a scalar {@link JsonValue} in its type color, quoting strings and printing `null` literally.
 * A string shows as a JSON string literal, so a quote or a newline in it shows as an escape.
 *
 * @internal
 */
export function JsonTreePrimitiveValue({ value }: { value: JsonValue }) {
	const type = valueType(value)

	const display = type === 'string' ? JSON.stringify(value) : String(value)

	// A key and a value are JSON, which a translation keeps as it is.
	return (
		<span className={k({ type }).value} translate="no">
			{display}
		</span>
	)
}
