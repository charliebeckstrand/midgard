import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript-6'

/**
 * Variant-axis defaults for a component, parsed from its kata file's
 * `defineRecipe({ …, defaults: { variant: 'solid', … } })` literal at
 * `<packageDir>/src/recipes/kata/<name>.ts`. Pure AST work — no type checker —
 * so a missing file, a kata without `defaults`, or a non-literal shape all
 * degrade to an empty record. Values keep their source text (`"'solid'"`),
 * matching the quoting of destructured defaults.
 */
export function readKataDefaults(packageDir: string, name: string): Record<string, string> {
	const file = path.join(packageDir, 'src', 'recipes', 'kata', `${name}.ts`)

	if (!fs.existsSync(file)) return {}

	const source = ts.createSourceFile(
		file,
		fs.readFileSync(file, 'utf8'),
		ts.ScriptTarget.Latest,
		true,
	)

	return parseKataDefaults(source)
}

/** The `defaults: {…}` entries of the first `defineRecipe({…})` call in a parsed kata source. */
function parseKataDefaults(source: ts.SourceFile): Record<string, string> {
	const config = findRecipeConfig(source)

	if (!config) return {}

	const defaults = findProperty(config, 'defaults')

	if (!defaults || !ts.isObjectLiteralExpression(defaults)) return {}

	const out: Record<string, string> = {}

	for (const prop of defaults.properties) {
		if (!ts.isPropertyAssignment(prop)) continue

		const key = propertyKey(prop.name)

		if (!key) continue

		out[key] = prop.initializer.getText(source)
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
			node.expression.text === 'defineRecipe'
		) {
			const first = node.arguments[0]

			if (first && ts.isObjectLiteralExpression(first)) {
				found = first

				return
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return found
}

/** Initializer of the named property in an object literal, or null. */
function findProperty(object: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
	for (const prop of object.properties) {
		if (!ts.isPropertyAssignment(prop)) continue

		if (propertyKey(prop.name) === name) return prop.initializer
	}

	return null
}

/** Literal text of an identifier / string / numeric property name. */
function propertyKey(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name)) return name.text

	if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text

	return null
}
