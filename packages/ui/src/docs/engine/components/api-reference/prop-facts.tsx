import { cn } from '../../../../core'
import type { PropDef } from '../../api-reference/types'
import { DefaultValue, isProseDefault, literalBlock } from './default-value'
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

const CHIP = 'rounded px-1.5 py-0.5 font-mono text-[0.8125rem]/5'

const OPTION_CHIP = cn(
	CHIP,
	'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
)

const TYPE_CHIP = cn(CHIP, 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300')

/**
 * What a prop accepts, as a row of tokens. Fixed choices are green chips, with
 * no prefix. Any other type is a gray chip, and an external type names its
 * package. A default follows behind a muted label. A structured default takes
 * its own row, with the label above the block. A type with resolved
 * references adds a link to those definitions. A default that is a sentence is
 * left to the description.
 */
export function PropFacts({ prop }: { prop: PropDef }) {
	const { options, others } = readSignature(prop.type)

	const literalDefault = prop.default && !isProseDefault(prop.default) ? prop.default : undefined

	const types = options.length > 0 ? others : [prop.type]

	return (
		<>
			<div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
				<span className="flex flex-wrap items-baseline gap-1.5">
					{options.map((option) => (
						<code key={option} data-slot="option" className={OPTION_CHIP}>
							{option}
						</code>
					))}
					{types.map((type) => (
						<code key={type} className={TYPE_CHIP}>
							{type}
						</code>
					))}
					{options.length === 0 && prop.externalFrom && (
						<span className="text-zinc-500 dark:text-zinc-400">
							from <code>{prop.externalFrom}</code>
						</span>
					)}
				</span>
				{literalDefault &&
					(literalBlock(literalDefault) ? (
						<div className="flex basis-full flex-col gap-1 text-zinc-500 dark:text-zinc-400">
							default
							<DefaultValue value={literalDefault} />
						</div>
					) : (
						<span className="text-zinc-500 dark:text-zinc-400">
							default <DefaultValue value={literalDefault} />
						</span>
					))}
			</div>
			<TypeReferences prop={prop} />
		</>
	)
}
