import { extractBalancedBraces, splitAtTopLevel } from './scanner'

/**
 * Parse an `index.ts` barrel file and return the list of publicly-exported
 * component-shaped names in declaration order. Filters out `type` exports,
 * lowercase utilities (hooks, helpers, variant functions), and context
 * providers' hook siblings.
 */
export function parsePublicExports(source: string): string[] {
	const results: string[] = []

	const seen = new Set<string>()

	const exportRegex = /export\s*(\{)/g

	for (let m = exportRegex.exec(source); m !== null; m = exportRegex.exec(source)) {
		const braceStart = m.index + m[0].length - 1

		const block = extractBalancedBraces(source, braceStart)

		if (!block) continue

		const inner = block.slice(1, -1)

		for (const raw of splitAtTopLevel(inner, ',', '\n')) {
			const entry = raw.trim()

			if (!entry) continue

			// Skip type-only exports: `type Foo`, `type Foo as Bar`
			if (/^type\s+/.test(entry)) continue

			// Handle aliasing: `Foo as Bar` → take `Bar`
			const aliasMatch = entry.match(/^(\w+)(?:\s+as\s+(\w+))?$/)

			if (!aliasMatch) continue

			const publicName = aliasMatch[2] ?? aliasMatch[1]

			if (!publicName) continue

			// Component-shape filter: PascalCase start
			if (!/^[A-Z]/.test(publicName)) continue

			if (seen.has(publicName)) continue

			seen.add(publicName)

			results.push(publicName)
		}
	}

	return results
}
