// @vitest-environment node
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractRecipeDefaults } from '../../api-reference/engine/extract-recipe-defaults'
import { createInMemoryProgram } from './helpers'

// A stand-in for the recipe engine: the extractor reads the call by its name
// and the config by its syntax, so the types can stay loose.
const recipe = `
export type VariantProps<R> = R extends (props: infer P) => string ? NonNullable<P> : never
export function defineRecipe<C, X = {}>(config: C, extras?: X): ((props?: Record<string, unknown>) => string) & X {
	return Object.assign(() => '', extras) as never
}
const delta = defineRecipe({ variant: {}, defaults: { trend: 'neutral' } })
export const k = defineRecipe({ variant: {}, defaults: { variant: 'solid', loading: false, size: 2, tone: someValue() } }, { delta })
function someValue() { return 'x' }
export type ThingVariants = VariantProps<typeof k>
export type DeltaVariants = VariantProps<typeof delta>
`

/** The recipe defaults of the function `name` in `index.tsx`, read from its first parameter's annotation. */
function recipeDefaults(component: string, name: string): Record<string, string> {
	const program = createInMemoryProgram({ 'recipe.ts': recipe, 'index.tsx': component })

	const sf = program.sourceFiles['index.tsx']

	const fn = sf?.statements.find(
		(s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === name,
	)

	const annotation = fn?.parameters[0]?.type

	if (!fn || !annotation) throw new Error(`no annotated function ${name}`)

	return Object.fromEntries(extractRecipeDefaults(annotation, fn, program.checker))
}

describe('extractRecipeDefaults', () => {
	it('reads the literal defaults of the recipe that the component calls', () => {
		const defaults = recipeDefaults(
			`import { k, type ThingVariants } from './recipe'
			type ThingProps = ThingVariants & { label?: string }
			export function Thing(props: ThingProps) { return k(props) }`,
			'Thing',
		)

		// `tone` is a call, not a literal, so it is not read.
		expect(defaults).toEqual({ variant: "'solid'", loading: 'false', size: '2' })
	})

	it('reads through a utility type', () => {
		const defaults = recipeDefaults(
			`import { k, type ThingVariants } from './recipe'
			export function Thing(props: Omit<ThingVariants, 'size'>) { return k(props) }`,
			'Thing',
		)

		expect(defaults).toHaveProperty('variant', "'solid'")
	})

	it('reads a slot recipe that the component names through a shorthand property', () => {
		const defaults = recipeDefaults(
			`import { k, type DeltaVariants } from './recipe'
			export function Delta(props: DeltaVariants) { return k.delta(props) }`,
			'Delta',
		)

		expect(defaults).toEqual({ trend: "'neutral'" })
	})

	it('reads nothing for a wrapper that does not name the recipe', () => {
		const defaults = recipeDefaults(
			`import type { ThingVariants } from './recipe'
			declare function Inner(props: ThingVariants): string
			export function Wrapper(props: ThingVariants) { return Inner({ variant: 'plain', ...props }) }`,
			'Wrapper',
		)

		expect(defaults).toEqual({})
	})
})
