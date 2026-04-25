import type { Ctx } from './types'

/**
 * Record an import for `name` from `mod`. Lazily allocates the inner Set so
 * the first import for a module doesn't need a separate setup step.
 */
export function addImport(ctx: Ctx, mod: string, name: string): void {
	const set = ctx.imports.get(mod) ?? new Set<string>()

	set.add(name)

	ctx.imports.set(mod, set)
}

/**
 * Combine the imports accumulated on `ctx` with the rendered JSX into the
 * final code block. Imports are sorted by module; `react` keeps its bare
 * specifier, everything else uses the `ui/*` package layout.
 */
export function assemble(ctx: Ctx, jsx: string): string {
	const imports = [...ctx.imports.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([mod, names]) => {
			const specifier = mod === 'react' ? 'react' : `ui/${mod}`

			return `import { ${[...names].sort().join(', ')} } from '${specifier}'`
		})
		.join('\n')

	return jsx ? `${imports}\n\n${jsx}` : imports
}
