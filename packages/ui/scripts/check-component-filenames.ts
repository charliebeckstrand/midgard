/**
 * Enforces the file-naming convention documented in CLAUDE.md → "File naming".
 *
 * Walks every leaf folder under `packages/ui/src/components/` and verifies each
 * `.ts` / `.tsx` file is one of:
 *
 * - the main component file:   `<folder>.tsx`
 * - a prefixed sub-file:       `<folder>-<part>.tsx`
 * - a prefixed hook:           `use-<folder>.ts(x)` or `use-<folder>-<hook>.ts(x)`
 * - a permitted bare file:     `index.ts(x)`, `types.ts`, `context.ts(x)`, `slots.ts`
 *
 * Existing offenders are pinned in `filename-allowlist.json`. CI fails on any
 * file not on the allowlist that breaks the rule. The allowlist shrinks as the
 * convention is rolled out and is deleted in the final sweep.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const componentsRoot = join(here, '..', 'src', 'components')
const allowlistPath = join(here, 'filename-allowlist.json')

const BARE_ALLOWED = new Set([
	'index.ts',
	'index.tsx',
	'types.ts',
	'context.ts',
	'context.tsx',
	'slots.ts',
	'slots.tsx',
])

type Violation = { path: string; reason: string }

function listLeafFolders(root: string): string[] {
	const out: string[] = []
	const walk = (dir: string) => {
		const entries = readdirSync(dir, { withFileTypes: true })
		const subdirs = entries.filter((e) => e.isDirectory())
		const files = entries.filter((e) => e.isFile())
		if (files.length > 0) out.push(dir)
		for (const d of subdirs) walk(join(dir, d.name))
	}
	walk(root)
	return out
}

function checkFolder(folderPath: string): Violation[] {
	const folderName = folderPath.split('/').pop() as string
	const violations: Violation[] = []

	for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
		if (!entry.isFile()) continue
		const file = entry.name
		if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue

		if (file === `${folderName}.tsx`) continue
		if (BARE_ALLOWED.has(file)) continue

		if (file.startsWith('use-')) {
			if (
				file === `use-${folderName}.ts` ||
				file === `use-${folderName}.tsx` ||
				file.startsWith(`use-${folderName}-`)
			)
				continue
			violations.push({
				path: relative(componentsRoot, join(folderPath, file)),
				reason: `hook filename must start with \`use-${folderName}\``,
			})
			continue
		}

		if (file === 'component.tsx') {
			violations.push({
				path: relative(componentsRoot, join(folderPath, file)),
				reason: `main file must be named \`${folderName}.tsx\``,
			})
			continue
		}

		if (file.startsWith(`${folderName}-`)) continue

		violations.push({
			path: relative(componentsRoot, join(folderPath, file)),
			reason: `filename must be prefixed with \`${folderName}-\``,
		})
	}

	return violations
}

const folders = listLeafFolders(componentsRoot)
const violations = folders.flatMap(checkFolder)

const writeMode = process.argv.includes('--write-allowlist')
if (writeMode) {
	const paths = violations.map((v) => v.path).sort()
	writeFileSync(allowlistPath, `${JSON.stringify(paths, null, '\t')}\n`)
	console.log(`Wrote ${paths.length} entries to ${relative(process.cwd(), allowlistPath)}`)
	process.exit(0)
}

const allowlist: string[] = existsSync(allowlistPath)
	? JSON.parse(readFileSync(allowlistPath, 'utf8'))
	: []
const allowed = new Set(allowlist)
const allViolationPaths = new Set(violations.map((v) => v.path))

const newViolations = violations.filter((v) => !allowed.has(v.path))
const staleAllowlist = allowlist.filter((p) => !allViolationPaths.has(p))

if (newViolations.length > 0) {
	console.error(`\n${newViolations.length} filename violation(s) in packages/ui/src/components:\n`)
	for (const v of newViolations) {
		console.error(`  ${v.path}`)
		console.error(`    ${v.reason}`)
	}
	console.error('\nSee CLAUDE.md → "File naming" for the rule.\n')
	process.exit(1)
}

if (staleAllowlist.length > 0) {
	console.error(
		`\n${staleAllowlist.length} stale allowlist entry/ies (file no longer exists or no longer violates):\n`,
	)
	for (const p of staleAllowlist) console.error(`  ${p}`)
	console.error('\nRemove them from packages/ui/scripts/filename-allowlist.json.\n')
	process.exit(1)
}

console.log(`OK · ${folders.length} folders checked · ${allowlist.length} allowlisted`)
