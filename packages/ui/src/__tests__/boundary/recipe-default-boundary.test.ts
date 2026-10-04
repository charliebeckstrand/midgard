/// <reference types="vite/client" />
import { basename, join } from 'node:path'
import {
	type Node as AstNode,
	isTypeAliasDeclaration,
	isTypeQueryNode,
	isTypeReferenceNode,
} from 'typescript/unstable/ast'
import { API, type Checker, SymbolFlags, type Symbol as TsSymbol } from 'typescript/unstable/sync'
import { describe, expect, it } from 'vitest'
import type { ResolvedConfig } from '../../core/recipe/engine/types'
import { srcDir } from '../helpers/walk-source'

// A recipe gives a default to an axis, and the component that takes the axis
// as a prop applies that default when the prop is unset. The docs read the
// default of a prop from its `@defaultValue` tag (CONVENTIONS.md §12.1), so a
// recipe default with no tag does not show.
//
// A kata exports the props of a recipe as `VariantProps<typeof k>`. That type
// maps the axes of the recipe, so it has no declaration that can hold a tag.
// The exported type of the kata thus declares each defaulted axis again, with
// the tag. This test holds the tag and the recipe default in step:
//
//   1. Each defaulted axis on an exported type has one `@defaultValue` tag.
//   2. The tag equals the default of the recipe, with the quotes of a string.
//   3. An axis with no recipe default has no tag.
//
// The defaults come from the recipes themselves (`recipe.config.defaults`).
// The tags and the link from a type to its recipe come from the TypeScript 7
// checker, which the docs also read. The checker reads the kata files and the
// files that they import, not the whole package, so the scan stays fast.

/** Each kata module, keyed by its path from this file. */
const kataModules = import.meta.glob<Record<string, unknown>>('../../recipes/kata/*.ts', {
	eager: true,
})

const uiRoot = join(srcDir, '..')

const kataDir = join(srcDir, 'recipes', 'kata')

const engineTypes = join(srcDir, 'core', 'recipe', 'engine', 'types.ts')

/**
 * The project that the checker opens. The file is not on disk: the API reads
 * its text through the `fs` callback. It extends the package config and lists
 * only the kata files.
 */
const projectConfig = join(uiRoot, 'tsconfig.recipe-defaults.json')

/** A callable recipe, as `defineRecipe` returns it. */
type Recipe = ((props?: object) => string) & { readonly config: ResolvedConfig }

/** A recipe that an export of a kata module reaches, with the property path to it. */
type Reached = { path: readonly string[]; recipe: Recipe }

function isRecipe(value: unknown): value is Recipe {
	return typeof value === 'function' && 'config' in value && typeof value.config === 'object'
}

/**
 * Each recipe that the exports of a module reach, such as `k`, `k.item`, or
 * `k.panel`. A sub-recipe is often a local `const` that only an export holds,
 * so the walk follows each property of each object and each recipe.
 */
function reachedRecipes(namespace: Record<string, unknown>): Reached[] {
	const reached: Reached[] = []

	const visit = (value: unknown, path: readonly string[], ancestors: Set<unknown>) => {
		if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return

		if (Array.isArray(value) || ancestors.has(value)) return

		if (isRecipe(value)) reached.push({ path, recipe: value })

		ancestors.add(value)

		for (const [key, child] of Object.entries(value)) visit(child, [...path, key], ancestors)

		ancestors.delete(value)
	}

	for (const [name, value] of Object.entries(namespace)) visit(value, [name], new Set())

	return reached
}

/** The source text of a default, as a `@defaultValue` tag writes it: `'solid'`, `false`, `1`. */
function literal(value: string | number | boolean): string {
	return typeof value === 'string' ? `'${value}'` : String(value)
}

/** The symbol that an import alias names, or the symbol itself. */
function resolved(checker: Checker, symbol: TsSymbol): TsSymbol {
	return symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** The result of the scan: each break of the rule, and the count of the types that it read. */
type Scan = { violations: string[]; checked: number }

function scan(): Scan {
	const files = Object.keys(kataModules).map((key) => join(kataDir, basename(key)))

	const config = JSON.stringify({
		extends: './tsconfig.json',
		compilerOptions: { incremental: false, types: [] },
		files,
		include: [],
	})

	const api = new API({
		cwd: uiRoot,
		fs: { readFile: (name) => (name === projectConfig ? config : undefined) },
	})

	try {
		const project = api.updateSnapshot({ openProjects: [projectConfig] }).getProject(projectConfig)

		if (!project) throw new Error('the checker did not open the kata project')

		const { program, checker } = project

		const exportsOf = (file: string): readonly TsSymbol[] => {
			const source = program.getSourceFile(file)

			const module = source && checker.getSymbolAtLocation(source)

			return module ? checker.getExportsOfModule(module) : []
		}

		const variantProps = exportsOf(engineTypes).find((symbol) => symbol.name === 'VariantProps')

		if (!variantProps) throw new Error('the checker found no `VariantProps` in the recipe engine')

		const violations: string[] = []

		let checked = 0

		for (const [key, namespace] of Object.entries(kataModules)) {
			const file = join(kataDir, basename(key))

			const label = `recipes/kata/${basename(key)}`

			const exports = exportsOf(file)

			// The type of each recipe that the exports reach, by the id of the type.
			// A `typeof` query of a recipe gives the same type, so the id links the
			// query to the runtime recipe.
			const recipeByType = new Map<number, Recipe>()

			const symbolByName = new Map(exports.map((symbol) => [symbol.name, symbol]))

			for (const { path, recipe } of reachedRecipes(namespace)) {
				const [head, ...rest] = path

				const symbol = head === undefined ? undefined : symbolByName.get(head)

				let type = symbol && checker.getTypeOfSymbol(symbol)

				for (const property of rest) {
					const member = type && checker.getPropertyOfType(type, property)

					type = member && checker.getTypeOfSymbol(member)
				}

				if (type) recipeByType.set(type.id, recipe)
			}

			for (const exported of exports) {
				const declaration = exported.declarations[0]?.resolve(project)

				if (!declaration || !isTypeAliasDeclaration(declaration)) continue

				// The recipes that the type reads through `VariantProps<typeof …>`.
				const recipes = new Set<Recipe>()

				const visit = (node: AstNode) => {
					if (isTypeReferenceNode(node)) {
						const name = checker.getSymbolAtLocation(node.typeName)

						const [argument] = node.typeArguments ?? []

						if (name && resolved(checker, name).id === variantProps.id && argument) {
							const type = isTypeQueryNode(argument)
								? checker.getTypeAtLocation(argument)
								: undefined

							const recipe = type && recipeByType.get(type.id)

							if (recipe) recipes.add(recipe)
							else violations.push(`${label} → ${exported.name}: no export reaches its recipe`)
						}
					}

					node.forEachChild(visit)
				}

				visit(declaration.type)

				if (recipes.size === 0) continue

				checked++

				const properties = checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(exported))

				for (const property of properties) {
					for (const { config } of recipes) {
						if (!(property.name in config.variants)) continue

						const value = config.defaults[property.name]

						const expected = value === undefined ? [] : [literal(value)]

						const tags = checker
							.getJsDocTagsOfSymbol(property)
							.filter((tag) => tag.name === 'defaultValue')
							.map((tag) => tag.text?.trim() ?? '')

						if (tags.join('\n') === expected.join('\n')) continue

						violations.push(
							`${label} → ${exported.name}.${property.name}: @defaultValue ${tags.join(', ') || '(none)'}, recipe default ${expected.join(', ') || '(none)'}`,
						)
					}
				}
			}
		}

		return { violations, checked }
	} finally {
		api.close()
	}
}

describe('recipe default boundary', () => {
	const { violations, checked } = scan()

	it('reads the exported types of the kata', () => {
		// A scan that linked no type to its recipe would pass the case below with
		// no violation.
		expect(checked).toBeGreaterThan(30)
	})

	it('gives each defaulted axis a @defaultValue tag that equals the recipe default', () => {
		expect(
			violations,
			`a kata type and its recipe disagree on a default (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
