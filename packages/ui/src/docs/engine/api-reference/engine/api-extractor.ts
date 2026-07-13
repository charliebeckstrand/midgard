import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Project } from 'ts-morph'
import type { ComponentApi } from '../types'
import { type Barrel, extractBarrel, listBarrels, openProject } from './build-api'
import { buildLinkTargetFiles, createLinkResolver } from './link-resolver'

/**
 * An incremental, disk-cached driver over {@link extractBarrel}. The docs plugin
 * holds one across a dev session: {@link ApiExtractor.getAll} returns the full
 * `{ key → ComponentApi[] }` record, and {@link ApiExtractor.notifyChanged}
 * feeds it the file a hot-update touched so the next `getAll` re-extracts only
 * the barrels that file feeds — replacing the whole-cache invalidation and the
 * per-request `new Project()` that re-type-checked the package on every edit.
 *
 * Extraction order (prop order, union member order) tracks the type checker's
 * warmup, so it must not vary with cache state. Two rules keep it stable: an
 * in-session re-extraction reuses the checker the first full pass warmed, and
 * the disk cache is whole-record — a clean restart replays the stored JSON
 * verbatim, and any source change triggers one full canonical pass.
 */
export type ApiExtractor = {
	/** The full API-reference record, built (or incrementally refreshed) on demand. */
	getAll: () => Record<string, ComponentApi[]>
	/** Note a changed/added/removed file; returns whether it feeds any barrel (so the caller can bust its virtual module). */
	notifyChanged: (file: string) => boolean
}

export type ApiExtractorOptions = {
	/**
	 * Where to persist the extracted JSON keyed by an input-file hash. Defaults to
	 * `<package>/node_modules/.cache/docs-api-reference`; pass `null` to disable
	 * persistence (tests, one-off builds).
	 */
	cacheDir?: string | null
}

/** A barrel's live extraction state: its result and the project-source files that feed it. */
type BarrelState = {
	/** `null` once the barrel resolves to nothing documentable, so it drops from the record. */
	api: ComponentApi[] | null
	/**
	 * Absolute paths of every file whose content the barrel's `api` depends on —
	 * its import closure plus `{@link}` targets. Empty when the state came from the
	 * disk cache (no project was opened), until the first in-session pass fills it.
	 */
	inputs: Set<string>
}

/** Persisted whole-record cache: the extracted record under the hash of all input files that produced it. */
type DiskCache = { version: number; hash: string; record: Record<string, ComponentApi[]> }

const CACHE_VERSION = 4

const CACHE_FILE = 'api.json'

/**
 * A file that can feed a barrel's output: project source, never `node_modules`,
 * the docs site, or test/bench fixtures — production barrels never import those,
 * so tracking them would re-extract on every unrelated test edit.
 */
function isInputFile(file: string): boolean {
	if (!/\.tsx?$/.test(file)) return false

	if (file.includes('/node_modules/') || file.includes('/docs/')) return false

	if (file.includes('/__tests__/') || file.includes('/__benchmarks__/')) return false

	return !/\.(test|bench|stories)\.tsx?$/.test(file)
}

/** Recursively collect every {@link isInputFile} path under `dir`. */
function collectInputFiles(dir: string, out: string[] = []): string[] {
	let entries: fs.Dirent[]

	try {
		entries = fs.readdirSync(dir, { withFileTypes: true })
	} catch {
		return out
	}

	for (const entry of entries) {
		const full = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			if (entry.name !== 'node_modules' && entry.name !== 'docs') collectInputFiles(full, out)
		} else if (entry.isFile() && isInputFile(full)) {
			out.push(full)
		}
	}

	return out
}

/** Create an incremental extractor for the package rooted at `srcDir`. */
export function createApiExtractor(
	srcDir: string,
	options: ApiExtractorOptions = {},
): ApiExtractor {
	const cacheDir =
		options.cacheDir === null
			? null
			: (options.cacheDir ??
				path.resolve(srcDir, '..', 'node_modules', '.cache', 'docs-api-reference'))

	// Content-hash memo, valid only within a single getAll pass; cleared before
	// each so a rebuild re-reads changed files from disk.
	const hashes = new Map<string, string>()

	const states = new Map<string, BarrelState>()

	// Reverse index (input file → barrel keys it feeds), rebuilt whenever any
	// barrel's inputs change. Drives per-file invalidation.
	const fileToBarrels = new Map<string, Set<string>>()

	const dirty = new Set<string>()

	const pendingRefresh = new Set<string>()

	let project: Project | null = null

	let barrels: Barrel[] = []

	let loaded = false

	// True once a full in-project extraction has warmed the checker in canonical
	// order this process; only then is a per-barrel subset re-extraction stable.
	let warmed = false

	function hashFile(file: string): string | null {
		const cached = hashes.get(file)

		if (cached !== undefined) return cached

		let hash: string | null

		try {
			hash = createHash('sha1').update(fs.readFileSync(file)).digest('hex')
		} catch {
			hash = null
		}

		if (hash !== null) hashes.set(file, hash)

		return hash
	}

	/** A digest over every input file's path and content — the disk cache's validity key. */
	function aggregateHash(): string {
		const files = collectInputFiles(srcDir).sort()

		const digest = createHash('sha1')

		for (const file of files)
			digest.update(path.relative(srcDir, file)).update(hashFile(file) ?? '')

		return digest.digest('hex')
	}

	function ensureProject(): Project {
		if (!project) project = openProject(srcDir)

		return project
	}

	// The checker and link machinery are recreated per extraction pass: refreshing
	// a source file rebuilds the underlying program, so a cached checker or link
	// index would read stale types.
	function extractionContext() {
		const proj = ensureProject()

		return {
			proj,
			checker: proj.getTypeChecker().compilerObject,
			resolveLink: createLinkResolver(proj),
			linkTargetFiles: buildLinkTargetFiles(proj),
		}
	}

	type Context = ReturnType<typeof extractionContext>

	/** The project-source files a barrel's output depends on: its import closure plus every `{@link}` target's source. */
	function inputsFor(
		proj: Project,
		barrel: Barrel,
		api: ComponentApi[] | null,
		linkTargetFiles: Map<string, string>,
		directRefs: Map<string, string[]>,
	): Set<string> {
		const inputs = new Set<string>([barrel.indexPath])

		const stack = [barrel.indexPath]

		while (stack.length > 0) {
			const file = stack.pop() as string

			let refs = directRefs.get(file)

			if (!refs) {
				const sf = proj.getSourceFile(file)

				refs = sf
					? sf
							.getReferencedSourceFiles()
							.map((s) => s.getFilePath() as string)
							.filter(isInputFile)
					: []

				directRefs.set(file, refs)
			}

			for (const ref of refs) {
				if (!inputs.has(ref)) {
					inputs.add(ref)

					stack.push(ref)
				}
			}
		}

		// `{@link}` targets resolve by name across the package with no import edge,
		// so their source files must be tracked explicitly.
		for (const name of linkNames(api)) {
			const target = linkTargetFiles.get(name)

			if (target && isInputFile(target)) inputs.add(target)
		}

		return inputs
	}

	/** Re-extract one barrel from an open project, updating its state and inputs. */
	function rebuildBarrel(key: string, ctx: Context, directRefs: Map<string, string[]>): void {
		const barrel = barrels.find((b) => b.key === key)

		if (!barrel) {
			states.delete(key)

			return
		}

		const api = extractBarrel(ctx.proj, ctx.checker, ctx.resolveLink, barrel.indexPath)

		const inputs = inputsFor(ctx.proj, barrel, api, ctx.linkTargetFiles, directRefs)

		states.set(key, { api, inputs })
	}

	/** Rebuild `fileToBarrels` from every barrel's current input set. */
	function reindex(): void {
		fileToBarrels.clear()

		for (const [key, state] of states) {
			for (const file of state.inputs) {
				const set = fileToBarrels.get(file) ?? new Set<string>()

				set.add(key)

				fileToBarrels.set(file, set)
			}
		}
	}

	/** Apply queued filesystem changes to the live project so the next extraction reads fresh source. */
	function applyRefreshes(proj: Project): void {
		let structural = false

		for (const file of pendingRefresh) {
			const existing = proj.getSourceFile(file)

			if (existing) {
				existing.refreshFromFileSystem()
			} else if (fs.existsSync(file)) {
				proj.addSourceFileAtPath(file)

				structural = true
			}
		}

		// A newly added file may pull in further dependencies; re-resolve so the
		// checker sees the complete graph.
		if (structural) proj.resolveSourceFileDependencies()

		pendingRefresh.clear()
	}

	/** Extract every barrel in canonical order, warming the checker's enumeration order for later subset passes. */
	function fullPass(): void {
		const ctx = extractionContext()

		const directRefs = new Map<string, string[]>()

		for (const barrel of barrels) rebuildBarrel(barrel.key, ctx, directRefs)

		warmed = true

		dirty.clear()
	}

	function snapshot(): Record<string, ComponentApi[]> {
		const result: Record<string, ComponentApi[]> = {}

		// `barrels` order is stable (listBarrels), keeping the manifest deterministic.
		for (const { key } of barrels) {
			const state = states.get(key)

			if (state?.api) result[key] = state.api
		}

		return result
	}

	function initialLoad(): void {
		barrels = listBarrels(srcDir)

		const disk = readDisk(cacheDir)

		if (disk && disk.hash === aggregateHash()) {
			// Byte-identical source: replay the stored record. No project is opened,
			// so `inputs` stay empty until the first edit forces a warming pass.
			for (const [key, api] of Object.entries(disk.record))
				states.set(key, { api, inputs: new Set() })
		} else {
			ensureProject()

			applyRefreshes(project as Project)

			fullPass()

			reindex()

			persist()
		}

		loaded = true
	}

	function incrementalRebuild(): void {
		const proj = ensureProject()

		applyRefreshes(proj)

		if (warmed) {
			const ctx = extractionContext()

			const directRefs = new Map<string, string[]>()

			for (const key of dirty) rebuildBarrel(key, ctx, directRefs)

			dirty.clear()
		} else {
			// First in-process pass (the disk cache served the initial load): warm the
			// checker with a full canonical pass so ordering matches the stored record.
			fullPass()
		}

		reindex()

		persist()
	}

	function persist(): void {
		writeDisk(cacheDir, aggregateHash(), snapshot())
	}

	return {
		getAll() {
			hashes.clear()

			if (!loaded) initialLoad()
			else if (dirty.size > 0 || pendingRefresh.size > 0) incrementalRebuild()

			return snapshot()
		},

		notifyChanged(file) {
			if (!isInputFile(file)) return false

			pendingRefresh.add(file)

			const affected = fileToBarrels.get(file)

			if (affected) {
				for (const key of affected) dirty.add(key)
			} else {
				// A file no barrel currently reads: a new module an edited import will
				// pull in, a shared file added since the last pass, or a disk-served load
				// whose inputs aren't mapped yet. Re-extract everything; the warming pass
				// then maps it precisely.
				for (const { key } of barrels) dirty.add(key)
			}

			return true
		},
	}
}

/** Every `{@link}` target name referenced by a barrel's components (description and prop links). */
function linkNames(api: ComponentApi[] | null): Set<string> {
	const names = new Set<string>()

	if (!api) return names

	for (const component of api) {
		if (component.links) for (const name of Object.keys(component.links)) names.add(name)

		for (const prop of component.props) {
			if (prop.links) for (const name of Object.keys(prop.links)) names.add(name)
		}
	}

	return names
}

function readDisk(cacheDir: string | null): DiskCache | null {
	if (!cacheDir) return null

	try {
		const raw = fs.readFileSync(path.join(cacheDir, CACHE_FILE), 'utf-8')

		const parsed = JSON.parse(raw) as DiskCache

		return parsed.version === CACHE_VERSION ? parsed : null
	} catch {
		return null
	}
}

function writeDisk(
	cacheDir: string | null,
	hash: string,
	record: Record<string, ComponentApi[]>,
): void {
	if (!cacheDir) return

	const payload: DiskCache = { version: CACHE_VERSION, hash, record }

	try {
		fs.mkdirSync(cacheDir, { recursive: true })

		fs.writeFileSync(path.join(cacheDir, CACHE_FILE), JSON.stringify(payload))
	} catch {
		// A read-only or full cache dir is non-fatal: extraction still works, just
		// without cross-restart reuse.
	}
}
