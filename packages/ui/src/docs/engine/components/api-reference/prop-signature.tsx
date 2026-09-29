'use client'

import { Badge } from '../../../../components/badge'
import { Flex } from '../../../../structure/flex'
import type { PropDef } from '../../api-reference/types'
import { DefaultValue, isProseDefault } from './default-value'
import { splitUnion, TypeCell, unquote } from './type-cell'

const LITERAL_ARM = /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d[\d_.]*)$/

/** The type of a prop, split into what it is and what it may be. */
export type Signature = {
	/** Plain type names: `string`, `boolean`, `null | HTMLElement`. */
	kind: string[]
	/** Literal members of a union, quotes intact: `'center'`, `'top'`. */
	options: string[]
}

/**
 * Split a type into its primitive and its options. A string-literal arm is an
 * option. It also names `string`, and a number-literal arm names `number`.
 * Every other arm is a plain type name and stays as written. Returns null for
 * a type that has to keep the full `TypeCell`: an external type, or one with
 * resolved references.
 */
export function readSignature(prop: PropDef): Signature | null {
	if (prop.externalFrom) return null

	if (prop.references && Object.keys(prop.references).length > 0) return null

	const arms = [...new Set(splitUnion(prop.type))]

	const options = arms.filter((arm) => LITERAL_ARM.test(arm))

	const kind = new Set<string>()

	for (const arm of arms) {
		if (!LITERAL_ARM.test(arm)) kind.add(arm)
		else kind.add(/^['"]/.test(arm) ? 'string' : 'number')
	}

	// A lone literal is a fixed value, not a choice.
	return { kind: [...kind], options: options.length > 1 ? options : [] }
}

/**
 * The facts a reader scans for, on one line: the type, the options, and the
 * default. The default is the filled option when it is one of the options.
 * Otherwise it follows as a labelled value. A default that is a sentence goes
 * to the description, so it never shows here.
 */
export function PropSignature({ prop }: { prop: PropDef }) {
	const signature = readSignature(prop)

	const literalDefault = prop.default && !isProseDefault(prop.default) ? prop.default : undefined

	const chosen = literalDefault ? unquote(literalDefault) : undefined

	const isOption = (option: string) => chosen !== undefined && unquote(option) === chosen

	const defaultIsOption = !!signature?.options.some(isOption)

	return (
		<Flex gap="sm" align="center" wrap>
			{signature ? (
				<span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
					{signature.kind.join(' | ')}
				</span>
			) : (
				<TypeCell prop={prop} />
			)}
			{signature?.options.map((option) => (
				<Badge key={option} variant={isOption(option) ? 'solid' : 'soft'}>
					{unquote(option)}
					{isOption(option) && <span className="ml-1.5 text-xs opacity-60">default</span>}
				</Badge>
			))}
			{literalDefault && !defaultIsOption && (
				<span className="text-sm text-zinc-500 dark:text-zinc-400">
					default <DefaultValue value={literalDefault} />
				</span>
			)}
		</Flex>
	)
}
