import { cn } from '../../core'
import { jsonValueColor, k } from '../../recipes/kata/json-tree'
import type { JsonValue } from './types'
import { valueType } from './utilities'

export function NodeKey({ keyName }: { keyName?: string | number }) {
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

export function PrimitiveValue({ value }: { value: JsonValue }) {
	const type = valueType(value)

	const display = value === null ? 'null' : type === 'string' ? `"${value}"` : String(value)

	return <span className={cn(jsonValueColor[type])}>{display}</span>
}
