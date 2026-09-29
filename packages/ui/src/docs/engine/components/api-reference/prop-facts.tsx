'use client'

import { Fragment, type ReactNode } from 'react'
import { Text } from '../../../../components/text'
import type { PropDef } from '../../api-reference/types'
import { DefaultValue, isProseDefault } from './default-value'
import { splitUnion, TypeReferences } from './type-references'

const LITERAL_ARM = /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d[\d_.]*)$/

/** A type read as a set of fixed choices plus any plain type names. */
export type Signature = {
	/** Literal members of a union, quotes intact: `'center'`, `'top'`. */
	options: string[]
	/** Every other arm as written: `boolean`, `null`, `HTMLElement`. */
	others: string[]
}

/**
 * Read a type as options and plain names. A union of two or more literals has
 * options. A lone literal is a fixed value, so it stays a plain name.
 */
export function readSignature(type: string): Signature {
	const arms = [...new Set(splitUnion(type))]

	const literals = arms.filter((arm) => LITERAL_ARM.test(arm))

	if (literals.length < 2) return { options: [], others: arms }

	return { options: literals, others: arms.filter((arm) => !LITERAL_ARM.test(arm)) }
}

/** Join code items as prose: `a`, `a or b`, `a, b, or c`. */
function orList(items: string[]): ReactNode {
	return items.map((item, i) => (
		<Fragment key={item}>
			{i > 0 && (items.length > 2 ? ', ' : ' ')}
			{i > 0 && i === items.length - 1 && 'or '}
			<code>{item}</code>
		</Fragment>
	))
}

/**
 * What a prop accepts, as a sentence in the way the React docs write one:
 * "One of `'a'`, `'b'`. Defaults to `'a'`." or "Type `boolean`. Defaults to
 * `true`." An external type names its package. A type with resolved references
 * adds a link to those definitions. A default that is a sentence is left to
 * the description.
 */
export function PropFacts({ prop }: { prop: PropDef }) {
	const { options, others } = readSignature(prop.type)

	const literalDefault = prop.default && !isProseDefault(prop.default) ? prop.default : undefined

	return (
		<>
			<Text tone="muted">
				{options.length > 0 ? (
					<>One of {orList([...options, ...others])}.</>
				) : (
					<>
						Type <code>{prop.type}</code>
						{prop.externalFrom && (
							<>
								{' '}
								from <code>{prop.externalFrom}</code>
							</>
						)}
						.
					</>
				)}
				{literalDefault && (
					<>
						{' '}
						Defaults to <DefaultValue value={literalDefault} />.
					</>
				)}
			</Text>
			<TypeReferences prop={prop} />
		</>
	)
}
