import { resolveObjectKeys } from './resolve-value'
import {
	extractBalancedBraces,
	extractBalancedParens,
	extractObjectKeys,
	splitAtTopLevel,
} from './scanner'
import type { CvaVariant } from './types'

/**
 * Scan source for `const name = cva(...)` definitions and extract variant metadata.
 * Also handles wrapper functions that return `cva(...)` (e.g. `colorCva`).
 * When `fullSource` is provided, variable references in variant values are resolved
 * across the entire source pool (e.g. recipe files).
 */
export function collectCvaVariants(source: string, fullSource?: string): Map<string, CvaVariant[]> {
	const result = new Map<string, CvaVariant[]>()

	// Prepend the per-file source so local variable definitions (e.g.
	// `variantBase`) are found before identically-named ones in other files.
	const resolvePool = fullSource ? `${source}\n${fullSource}` : source

	// Direct cva() or tv() calls: const X = cva(...) / const X = tv(...)
	const cvaRegex = /const\s+(\w+)\s*=\s*(?:cva|tv)\s*\(/g

	for (let m = cvaRegex.exec(source); m !== null; m = cvaRegex.exec(source)) {
		const name = m[1]

		const parenStart = m.index + m[0].length - 1

		const cvaArgs = extractBalancedParens(source, parenStart)

		if (!cvaArgs) continue

		const variants = parseCvaVariants(cvaArgs, resolvePool)

		if (variants.length > 0) {
			result.set(name, variants)
		}
	}

	// Wrapper function calls: const X = someWrapper(...)
	// Resolves through the wrapper's function body to find the inner cva() call,
	// substituting actual arguments for formal parameters.
	const wrapperRegex = /const\s+(\w+)\s*=\s*(\w+)\s*\(/g

	for (let m = wrapperRegex.exec(source); m !== null; m = wrapperRegex.exec(source)) {
		const varName = m[1]
		const funcName = m[2]

		if (!varName || !funcName) continue

		// Skip direct cva/tv calls (already handled) and known non-wrapper functions
		if (funcName === 'cva' || funcName === 'tv' || result.has(varName)) continue

		const parenStart = m.index + m[0].length - 1

		const callArgs = extractBalancedParens(source, parenStart)

		if (!callArgs) continue

		const variants = resolveWrapperCva(funcName, callArgs, resolvePool)

		if (variants && variants.length > 0) {
			result.set(varName, variants)
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

/**
 * Resolve a wrapper function call to cva variants by finding the function
 * definition, locating the inner cva() call, and substituting actual arguments
 * for formal parameters.
 */
function resolveWrapperCva(
	funcName: string,
	callArgs: string,
	source: string,
): CvaVariant[] | null {
	// Find the function body
	const funcRegex = new RegExp(`(?:export\\s+)?function\\s+${funcName}\\s*(?:<[^>]*>)?\\s*\\(`, 'g')

	const funcMatch = funcRegex.exec(source)

	if (!funcMatch) return null

	// Extract the parameter list
	const paramStart = funcMatch.index + funcMatch[0].length - 1

	const paramBlock = extractBalancedParens(source, paramStart)

	if (!paramBlock) return null

	// Extract the function body
	const bodySearchStart = paramStart + paramBlock.length

	const bodyStart = source.indexOf('{', bodySearchStart)

	if (bodyStart === -1) return null

	const funcBody = extractBalancedBraces(source, bodyStart)

	if (!funcBody) return null

	// Look for cva( inside the function body
	const innerCvaMatch = funcBody.match(/\bcva\s*\(/)

	if (!innerCvaMatch?.index) return null

	const innerParenStart = funcBody.indexOf('(', innerCvaMatch.index)

	const innerCvaArgs = extractBalancedParens(funcBody, innerParenStart)

	if (!innerCvaArgs) return null

	// Build param name → actual argument mapping
	const paramNames = extractParamNames(paramBlock)

	const actualArgs = splitAtTopLevel(callArgs.slice(1, -1), ',').map((a) => a.trim())

	// Substitute formal params with actual args in the cva config
	let substituted = innerCvaArgs

	for (let i = 0; i < paramNames.length && i < actualArgs.length; i++) {
		const param = paramNames[i]

		if (!param) continue

		// Word-boundary-aware replacement to avoid partial matches
		substituted = substituted.replace(new RegExp(`\\b${param}\\b`, 'g'), actualArgs[i])
	}

	return parseCvaVariants(substituted, source)
}

/** Extract parameter names from a function parameter list `(a: Type, b: Type)` */
function extractParamNames(paramBlock: string): string[] {
	const inner = paramBlock.slice(1, -1).trim()

	if (!inner) return []

	return splitAtTopLevel(inner, ',')
		.map((param) => {
			const trimmed = param.trim()

			// Handle `name: Type`, `name?: Type`, `name = default`, plain `name`
			const match = trimmed.match(/^(\w+)/)

			return match?.[1] ?? null
		})
		.filter((name): name is string => name !== null)
}

function parseCvaVariants(cvaArgs: string, fullSource: string): CvaVariant[] {
	const variants: CvaVariant[] = []

	const variantsMatch = cvaArgs.match(/variants\s*:\s*\{/)

	if (!variantsMatch?.index) return variants

	const variantsStart = variantsMatch.index + variantsMatch[0].length - 1

	const variantsBody = extractBalancedBraces(cvaArgs, variantsStart)

	if (!variantsBody) return variants

	const defaults = parseDefaultVariants(cvaArgs, fullSource)

	const inner = variantsBody.slice(1, -1)

	for (const entry of splitAtTopLevel(inner, ',')) {
		const trimmed = entry.trim()

		if (!trimmed) continue

		// `name: value` or shorthand `name` (treated as `name: name`).
		const kvMatch = trimmed.match(/^(\w+)\s*:\s*([\s\S]+)$/)

		const shorthandMatch = !kvMatch && trimmed.match(/^(\w+)$/)

		if (!kvMatch && !shorthandMatch) continue

		const variantName = (kvMatch?.[1] ?? shorthandMatch?.[1]) as string

		const valueExpr = stripAsCast((kvMatch?.[2] ?? variantName).trim())

		let options: string[]

		if (valueExpr.startsWith('{')) {
			// Inline object — extract keys directly
			const optionsBody = extractBalancedBraces(valueExpr, 0)

			options = optionsBody ? extractObjectKeys(optionsBody) : []
		} else {
			// Reference — resolve through the source pool
			options = resolveObjectKeys(valueExpr, fullSource) ?? []
		}

		if (options.length > 0) {
			variants.push({
				name: variantName,
				options,
				defaultValue: defaults.get(variantName),
			})
		}
	}

	return variants
}

function parseDefaultVariants(cvaArgs: string, fullSource: string): Map<string, string> {
	const defaults = new Map<string, string>()

	const defaultsMatch = cvaArgs.match(/defaultVariants\s*:\s*/)

	if (!defaultsMatch?.index) return defaults

	const afterMatch = defaultsMatch.index + defaultsMatch[0].length

	const rest = cvaArgs.slice(afterMatch).trim()

	let defaultsBody: string | null = null

	if (rest.startsWith('{')) {
		// Inline object
		defaultsBody = extractBalancedBraces(cvaArgs, afterMatch)
	} else {
		// Reference (e.g. k.defaults) — resolve it
		const refMatch = rest.match(/^([\w.]+)/)
		if (refMatch) {
			const resolved = resolveObjectKeys(refMatch[1], fullSource)

			// resolveObjectKeys returns keys, but we need key-value pairs.
			// Fall back to inline extraction only.
			if (!resolved) return defaults

			// Re-find the resolved object to extract defaults from it
			defaultsBody = findResolvedObjectBody(refMatch[1], fullSource)
		}
	}

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

/**
 * Try to find the actual object body that an expression resolves to,
 * so we can extract key-value pairs (not just keys).
 */
/** Strip a trailing `as Type` cast from an expression (e.g. `k.color as MutableTokenMap` → `k.color`). */
function stripAsCast(expr: string): string {
	return expr.replace(/\s+as\s+[\w.<>,\s|&[\]]+$/, '').trim()
}

function findResolvedObjectBody(expr: string, source: string): string | null {
	const parts = expr.split('.')

	const current = parts[0]

	// Resolve the root variable
	const rootRegex = new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${current}\\s*=\\s*`, 'g')

	const rootMatch = rootRegex.exec(source)

	if (!rootMatch) return null

	const start = rootMatch.index + rootMatch[0].length

	if (parts.length === 1) {
		if (source[start] === '{') return extractBalancedBraces(source, start)

		return null
	}

	// For member expressions, we'd need to walk into the object.
	// This is a best-effort helper — return null for complex cases.
	return null
}
