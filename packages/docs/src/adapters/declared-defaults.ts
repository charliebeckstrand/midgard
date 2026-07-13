import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript-6'
import type { ExtraDefaults } from '../extractor'

/** Options for {@link declaredDefaults}. */
export type DeclaredDefaultsOptions = {
	/** Directory under the package dir holding one source file per component. */
	dir: string

	/** Identifier of the factory call whose first object-literal argument carries the defaults. */
	call: string

	/** Property inside that object literal holding the defaults map. @defaultValue 'defaults' */
	property?: string

	/** Maps an export name to its file basename (no extension). @defaultValue kebab-case */
	basename?: (componentName: string) => string

	/** Source file extension. @defaultValue 'ts' */
	extension?: string
}

/**
 * An {@link ExtraDefaults} reader for libraries that declare a component's
 * defaults in a `<call>({ <property>: { key: 'value', … } })` literal in a
 * per-component source file — a design system's variant-axis defaults, say.
 * Configure the `dir`, the `call` name, and (if not kebab-case) the `basename`
 * scheme; values keep their source text (`"'solid'"`) to match destructured
 * defaults. Pure AST work, memoized per file. Opt-in — nothing in the
 * extractor core references it or the convention it reads.
 *
 * ```ts
 * extraDefaults: declaredDefaults({ dir: 'src/recipes/kata', call: 'defineRecipe' })
 * ```
 */
export function declaredDefaults(options: DeclaredDefaultsOptions): ExtraDefaults {
	const { dir, call, property = 'defaults', basename = kebabCase, extension = 'ts' } = options

	const cache = new Map<string, Record<string, string>>()

	return (packageDir, componentName) => {
		const file = path.join(packageDir, dir, `${basename(componentName)}.${extension}`)

		const cached = cache.get(file)

		if (cached) return cached

		const source = fs.existsSync(file)
			? readDefaults(
					ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true),
					call,
					property,
				)
			: {}

		cache.set(file, source)

		return source
	}
}

/** `CommandPalette` → `command-palette`. */
export function kebabCase(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** The `<property>: {…}` entries of the first `<call>({…})` in a parsed source, as source text. */
function readDefaults(
	source: ts.SourceFile,
	call: string,
	property: string,
): Record<string, string> {
	const config = findCallConfig(source, call)

	if (!config) return {}

	const defaults = findProperty(config, property)

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

/** First argument of the first `<call>(…)` call expression, when it is an object literal. */
function findCallConfig(source: ts.SourceFile, call: string): ts.ObjectLiteralExpression | null {
	let found: ts.ObjectLiteralExpression | null = null

	const visit = (node: ts.Node): void => {
		if (found) return

		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === call
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
