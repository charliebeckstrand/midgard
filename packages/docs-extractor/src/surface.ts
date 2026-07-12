import fs from 'node:fs'
import path from 'node:path'

/**
 * Enumerate a package's public surface from its `package.json` `exports` map:
 * import specifier → absolute entry file. Fixed entries resolve directly;
 * wildcard entries (`./primitives/*`) enumerate matching directories on disk;
 * array-valued fallbacks (`./*`) try each candidate pattern in order, first
 * match winning. Anything under `src/docs` is excluded. Insertion order
 * follows the exports map, so more specific keys claim their specifiers first.
 */
export function enumerateSurface(packageDir: string, packageName: string): Map<string, string> {
	const surface = new Map<string, string>()

	for (const [key, value] of Object.entries(readExportsMap(packageDir))) {
		const targets = flattenTargets(value)

		if (key.includes('*')) {
			addWildcardEntries(surface, packageDir, packageName, key, targets)

			continue
		}

		const specifier = specifierFor(packageName, key)

		for (const target of targets) {
			const entry = resolveEntry(packageDir, target)

			if (!entry) continue

			if (!surface.has(specifier)) surface.set(specifier, entry)

			break
		}
	}

	return surface
}

/** The parsed `exports` field, or an empty map when absent. */
function readExportsMap(packageDir: string): Record<string, unknown> {
	const manifestPath = path.join(packageDir, 'package.json')

	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
		exports?: Record<string, unknown>
	}

	return manifest.exports ?? {}
}

/**
 * Candidate relative paths of one exports-map value, in declaration order.
 * Strings pass through; conditional objects prefer `types`, then `default`,
 * then any string condition; arrays concatenate their members' candidates.
 */
function flattenTargets(value: unknown): string[] {
	if (typeof value === 'string') return [value]

	if (Array.isArray(value)) return value.flatMap((member) => flattenTargets(member))

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>

		const preferred = record.types ?? record.default

		if (typeof preferred === 'string') return [preferred]

		return Object.values(record).flatMap((member) => flattenTargets(member))
	}

	return []
}

/** `.` → the bare package name; `./core` → `<name>/core`. */
function specifierFor(packageName: string, key: string): string {
	if (key === '.') return packageName

	return `${packageName}/${key.replace(/^\.\//, '')}`
}

/**
 * Expand one wildcard exports key against the disk: each target pattern's
 * directory segment before `*` is enumerated, and every directory whose
 * substituted entry file exists claims the substituted specifier. Earlier
 * target patterns win, so `./*`'s components-then-modules array keeps
 * component directories ahead of module ones.
 */
function addWildcardEntries(
	surface: Map<string, string>,
	packageDir: string,
	packageName: string,
	key: string,
	targets: string[],
): void {
	for (const target of targets) {
		const star = target.indexOf('*')

		if (star < 0) continue

		const prefix = target.slice(0, star)

		const suffix = target.slice(star + 1)

		const parentDir = path.resolve(packageDir, prefix)

		if (!fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) continue

		for (const dirent of fs.readdirSync(parentDir, { withFileTypes: true })) {
			if (!dirent.isDirectory()) continue

			const entry = resolveEntry(packageDir, `${prefix}${dirent.name}${suffix}`)

			if (!entry) continue

			const specifier = specifierFor(packageName, key.replace('*', dirent.name))

			if (!surface.has(specifier)) surface.set(specifier, entry)
		}
	}
}

/** Absolute path for an existing, non-docs entry target; null otherwise. */
function resolveEntry(packageDir: string, target: string): string | null {
	const entry = path.resolve(packageDir, target)

	const relative = path.relative(packageDir, entry).split(path.sep).join('/')

	if (relative.startsWith('src/docs/')) return null

	if (!fs.existsSync(entry) || !fs.statSync(entry).isFile()) return null

	return entry
}
