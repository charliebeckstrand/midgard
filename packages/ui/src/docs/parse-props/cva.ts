import {
	extractBalancedBraces,
	extractBalancedParens,
	extractObjectKeys,
	splitAtTopLevel,
} from './scanner'
import type { CvaVariant } from './types'

/** Scan source for `const name = cva(...)` definitions and extract variant metadata */
export function collectCvaVariants(source: string): Map<string, CvaVariant[]> {
	const result = new Map<string, CvaVariant[]>()
	const cvaRegex = /const\s+(\w+)\s*=\s*cva\s*\(/g

	for (let m = cvaRegex.exec(source); m !== null; m = cvaRegex.exec(source)) {
		const name = m[1]
		const parenStart = m.index + m[0].length - 1
		const cvaArgs = extractBalancedParens(source, parenStart)

		if (!cvaArgs) continue

		const variants = parseCvaVariants(cvaArgs)

		if (variants.length > 0) {
			result.set(name, variants)
		}
	}

	return result
}

/** Convert CVA variants to a synthetic `{ name?: 'a' | 'b' }` type body */
export function cvaVariantsToTypeBody(variants: CvaVariant[]): string {
	const entries = variants
		.map((v) => {
			const type = v.options.map((o) => `'${o}'`).join(' | ')
			return `${v.name}?: ${type}`
		})
		.join('\n')

	return `{ ${entries} }`
}

function parseCvaVariants(cvaArgs: string): CvaVariant[] {
	const variants: CvaVariant[] = []

	const variantsMatch = cvaArgs.match(/variants\s*:\s*\{/)

	if (!variantsMatch?.index) return variants

	const variantsStart = variantsMatch.index + variantsMatch[0].length - 1
	const variantsBody = extractBalancedBraces(cvaArgs, variantsStart)

	if (!variantsBody) return variants

	const defaults = parseDefaultVariants(cvaArgs)

	const inner = variantsBody.slice(1, -1)
	const variantKeyRegex = /(\w+)\s*:\s*\{/g

	for (let m = variantKeyRegex.exec(inner); m !== null; m = variantKeyRegex.exec(inner)) {
		const variantName = m[1]
		const braceStart = m.index + m[0].length - 1
		const optionsBody = extractBalancedBraces(inner, braceStart)

		if (!optionsBody) continue

		variants.push({
			name: variantName,
			options: extractObjectKeys(optionsBody),
			defaultValue: defaults.get(variantName),
		})
	}

	return variants
}

function parseDefaultVariants(cvaArgs: string): Map<string, string> {
	const defaults = new Map<string, string>()
	const defaultsMatch = cvaArgs.match(/defaultVariants\s*:\s*\{/)

	if (!defaultsMatch?.index) return defaults

	const defaultsStart = defaultsMatch.index + defaultsMatch[0].length - 1
	const defaultsBody = extractBalancedBraces(cvaArgs, defaultsStart)

	if (!defaultsBody) return defaults

	const inner = defaultsBody.slice(1, -1)

	for (const entry of splitAtTopLevel(inner, ',')) {
		const match = entry.trim().match(/(\w+)\s*:\s*['"]([^'"]+)['"]/)

		if (match) {
			defaults.set(match[1], `'${match[2]}'`)
		}
	}

	return defaults
}
