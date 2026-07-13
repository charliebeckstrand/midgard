import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import type { ExtraDefaults } from './extractor'

// ui's variant-axis defaults live in a `defineRecipe({ defaults: {…} })` literal
// at src/recipes/kata/<kebab>.ts. This reader hands them to the extractor
// through its agnostic `extraDefaults` seam — the extractor itself knows
// nothing of recipes. Build-time only; memoized per component file.
const cache = new Map<string, Record<string, string>>()

/** An {@link ExtraDefaults} reader for ui's recipe convention; values keep their source text (`"'solid'"`). */
export const readRecipeDefaults: ExtraDefaults = (packageDir, componentName) => {
	const file = path.join(packageDir, 'src', 'recipes', 'kata', `${kebabCase(componentName)}.ts`)

	const cached = cache.get(file)

	if (cached) return cached

	const defaults = fs.existsSync(file)
		? readDefaults(
				ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true),
			)
		: {}

	cache.set(file, defaults)

	return defaults
}

/** `CommandPalette` → `command-palette`. */
function kebabCase(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** The `defaults: {…}` entries of the first `defineRecipe({…})` call, as source text. */
function readDefaults(source: ts.SourceFile): Record<string, string> {
	const config = findRecipeConfig(source)

	const defaults = config && findProperty(config, 'defaults')

	if (!defaults || !ts.isObjectLiteralExpression(defaults)) return {}

	const out: Record<string, string> = {}

	for (const prop of defaults.properties) {
		if (!ts.isPropertyAssignment(prop)) continue

		const key = propertyKey(prop.name)

		if (key) out[key] = prop.initializer.getText(source)
	}

	return out
}

/** First argument of the first `defineRecipe(…)` call, when it is an object literal. */
function findRecipeConfig(source: ts.SourceFile): ts.ObjectLiteralExpression | null {
	let found: ts.ObjectLiteralExpression | null = null

	const visit = (node: ts.Node): void => {
		if (found) return

		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'defineRecipe' &&
			ts.isObjectLiteralExpression(node.arguments[0] ?? node)
		) {
			found = node.arguments[0] as ts.ObjectLiteralExpression

			return
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return found
}

/** Initializer of the named property in an object literal, or null. */
function findProperty(object: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
	for (const prop of object.properties) {
		if (ts.isPropertyAssignment(prop) && propertyKey(prop.name) === name) return prop.initializer
	}

	return null
}

/** Literal text of an identifier / string / numeric property name. */
function propertyKey(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
		return name.text

	return null
}
