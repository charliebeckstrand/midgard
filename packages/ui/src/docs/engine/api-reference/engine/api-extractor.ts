import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Project, ts } from 'ts-morph'
import type { ComponentApi } from '../types'
import { type Barrel, extractBarrel, listBarrels, openProject, tsConfigPathFor } from './build-api'

/**
 * An incremental, disk-cached driver over {@link extractBarrel}. The docs plugin
 * holds one across a dev session. Its {@link ApiExtractor.getAll} returns the
 * full `{ key → ComponentApi[] }` record. Its {@link ApiExtractor.notifyChanged}
 * feeds it the file a hot-update touched, so the next `getAll` re-extracts only
 * the barrels that file feeds. That replaces the whole-cache invalidation and
 * the per-request `new Project()` that re-type-checked the package on every
 * edit.
 *
 * Some extraction order tracks the type checker's warmup: the order of props,
 * and of union members that no declaration orders (see `literal-order.ts`).
 * Each pass after an edit runs on a fresh checker. A full pass visits the
 * barrels in canonical order, so its output is the same in each process. A
 * subset pass warms the checker on fewer barrels, so its output can differ in
 * order. The disk cache therefore stores only a full pass. A clean restart
 * replays that record verbatim, and a source change since it triggers one full
 * canonical pass.
 */
export type ApiExtractor = {
	/** The full API-reference record, built (or incrementally refreshed) on demand. */
	getAll: () => Record<string, ComponentApi[]>
	/**
	 * Note a changed/added/removed file; returns whether it feeds any barrel (so
	 * the caller can bust its virtual module).
	 *
	 * @remarks
	 * The report also drops the file from the content-hash memo, which keeps the
	 * disk cache's key current; see {@link aggregateHash}.
	 */
	notifyChanged: (file: string) => boolean
}

export type ApiExtractorOptions = {
	/**
	 * Where to persist the extracted JSON, keyed by an input-file hash and the
	 * {@link extractorFingerprint}. Defaults to
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

/**
 * Persisted whole-record cache: the extracted record under the hash of all
 * input files that produced it, and the fingerprint of the extractor that
 * produced it.
 */
type DiskCache = { fingerprint: string; hash: string; record: Record<string, ComponentApi[]> }

const CACHE_FILE = 'api.json'

/** The docs engine, two levels above this file. */
const ENGINE_DIR = fileURLToPath(new URL('../..', import.meta.url))

/** A directory of the engine that holds no code of the extractor. */
const NON_SOURCE_DIR = /(?:^|\/)(?:__tests__|__benchmarks__)\//

/**
 * A fingerprint of what shapes the extracted record besides the package source
 * that {@link aggregateHash} keys. It hashes the code of the docs engine, the
 * tsconfig chain of the package, and the nearest `pnpm-lock.yaml`. The lockfile
 * pins TypeScript, ts-morph, and the React typings that the extractor reads.
 * A stored record under another fingerprint is stale. A change to the extractor
 * therefore invalidates the disk cache with no version kept by hand.
 *
 * It hashes each `.ts` file of the engine outside its tests and benchmarks, not
 * only the extractor. The extractor imports helpers from across the engine, and
 * a list of them would drift. The cost is one cold extraction after an engine
 * edit that does not change the record.
 *
 * @internal
 */
export function extractorFingerprint(srcDir: string, engineDir: string = ENGINE_DIR): string {
	const digest = createHash('sha1')

	const sources = fs
		.readdirSync(engineDir, { recursive: true, encoding: 'utf-8' })
		.map(toPosix)
		.filter((rel) => rel.endsWith('.ts') && !rel.endsWith('.d.ts') && !NON_SOURCE_DIR.test(rel))
		.sort()

	for (const rel of sources) digest.update(rel).update(fs.readFileSync(path.join(engineDir, rel)))

	const configs = [...tsConfigChain(tsConfigPathFor(srcDir)), findUp(srcDir, 'pnpm-lock.yaml')]

	// A missing file hashes as its absence, so adding one moves the key too.
	for (const file of configs) digest.update(file ? readOrEmpty(file) : '\0')

	return digest.digest('hex')
}

/** A tsconfig and each file that it extends by a relative path, nearest first. */
function tsConfigChain(file: string): string[] {
	const chain: string[] = []

	for (let next: string | undefined = file; next && !chain.includes(next); ) {
		chain.push(next)

		const { config } = ts.readConfigFile(next, ts.sys.readFile)

		const parent: unknown = config?.extends

		next =
			typeof parent === 'string' && parent.startsWith('.')
				? path.resolve(path.dirname(next), parent.endsWith('.json') ? parent : `${parent}.json`)
				: undefined
	}

	return chain
}

/** The path of `name` in `dir` or its nearest ancestor that has it. */
function findUp(dir: string, name: string): string | undefined {
	for (let current = path.resolve(dir); ; current = path.dirname(current)) {
		const candidate = path.join(current, name)

		if (fs.existsSync(candidate)) return candidate

		if (path.dirname(current) === current) return undefined
	}
}

function readOrEmpty(file: string): Buffer | string {
	try {
		return fs.readFileSync(file)
	} catch {
		return ''
	}
}

/**
 * Normalize to forward slashes so Windows `path.join` output and ts-morph's
 * posix-style paths compare equal as map keys and in segment checks.
 */
function toPosix(file: string): string {
	return file.replace(/\\/g, '/')
}

/**
 * Directories that hold no barrel input. {@link isInputFile} rejects every path
 * under them, so the walk prunes them instead of descending and discarding.
 * They hold about a third of the files under this package's `src`.
 */
const SKIPPED_DIRS = new Set(['node_modules', 'docs', '__tests__', '__benchmarks__'])

/**
 * A file that can feed a barrel's output: project source, never `node_modules`,
 * the docs site, or test/bench fixtures. Production barrels never import those,
 * so tracking them would re-extract on every unrelated test edit.
 */
function isInputFile(file: string): boolean {
	const posix = toPosix(file)

	if (!/\.tsx?$/.test(posix)) return false

	if (posix.includes('/node_modules/') || posix.includes('/docs/')) return false

	if (posix.includes('/__tests__/') || posix.includes('/__benchmarks__/')) return false

	return !/\.(test|bench|stories)\.tsx?$/.test(posix)
}

/** Recursively collect every {@link isInputFile} path under `dir`, past {@link SKIPPED_DIRS}. */
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
			if (!SKIPPED_DIRS.has(entry.name)) collectInputFiles(full, out)
		} else if (entry.isFile() && isInputFile(full)) {
			out.push(full)
		}
	}

	return out
}

/**
 * Hash one input file's content, and record it in `hashes`. Returns `null` when
 * the read fails — a deleted file, which stays out of the memo so a later add
 * reads it again.
 */
function hashFile(file: string, hashes: Map<string, string>): string | null {
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

/**
 * A digest over every input file's path and content — the disk cache's validity
 * key. The walk runs on every call, so an added or a deleted file moves the key.
 * Content comes from the `hashes` memo, which this function fills in place.
 *
 * @remarks
 * The memo makes the key blind to an edit that never reaches
 * {@link ApiExtractor.notifyChanged} — a watcher miss, or a write from outside
 * the dev server. That is deliberate. The extractor refreshes its project from
 * the same reports, so an edit that skips one is already absent from the record
 * this key labels. The memo gives the key the same blind spot, so the key and
 * the record agree.
 *
 * A key that reads disk on every call is worse. It can validate a record that
 * the same missed edit made stale, and that pair survives every restart. A key
 * that agrees with its record fails the check on the next start instead,
 * because a fresh extractor starts with an empty memo.
 *
 * @internal
 */
export function aggregateHash(srcDir: string, hashes: Map<string, string>): string {
	const files = collectInputFiles(srcDir).sort()

	// The walk joins every path onto `srcDir`, so a slice yields what
	// `path.relative` yields and saves about a quarter of the warm cost here.
	const rootLength = srcDir.endsWith(path.sep) ? srcDir.length : srcDir.length + 1

	const digest = createHash('sha1')

	for (const file of files)
		digest.update(file.slice(rootLength)).update(hashFile(file, hashes) ?? '')

	return digest.digest('hex')
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

	// Computed once, and only when a cache dir needs it.
	let fingerprint: string | undefined

	const fingerprintOf = () => {
		fingerprint ??= extractorFingerprint(srcDir)

		return fingerprint
	}

	// Content-hash memo for `aggregateHash`. It lives as long as the extractor:
	// `notifyChanged` drops the path it reports, so a rebuild re-hashes those
	// files rather than the whole tree.
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

	// True once a full pass has run in this process. The pass maps the inputs of
	// each barrel, so a later edit re-extracts only the barrels that it feeds.
	let mapped = false

	function ensureProject(): Project {
		if (!project) project = openProject(srcDir)

		return project
	}

	// The checker is recreated per extraction pass: a refreshed source file
	// rebuilds the underlying program, so a cached checker reads stale types.
	function extractionContext() {
		const proj = ensureProject()

		return { proj, checker: proj.getTypeChecker().compilerObject }
	}

	type Context = ReturnType<typeof extractionContext>

	/**
	 * The project-source files a barrel's output depends on: its import closure.
	 * A `{@link}` adds no input, because the output keeps the token as written
	 * and never reads the file that declares its target.
	 */
	function inputsFor(
		proj: Project,
		barrel: Barrel,
		directRefs: Map<string, string[]>,
	): Set<string> {
		const inputs = new Set<string>([toPosix(barrel.indexPath)])

		const stack = [toPosix(barrel.indexPath)]

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

		return inputs
	}

	/** Re-extract one barrel from an open project, updating its state and inputs. */
	function rebuildBarrel(key: string, ctx: Context, directRefs: Map<string, string[]>): void {
		const barrel = barrels.find((b) => b.key === key)

		if (!barrel) {
			states.delete(key)

			return
		}

		const api = extractBarrel(ctx.proj, ctx.checker, barrel.indexPath)

		const inputs = inputsFor(ctx.proj, barrel, directRefs)

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
				// Synchronous: `applyRefreshes` runs inside the synchronous `getAll`
				// pass, so the async `refreshFromFileSystem` would resolve its read only
				// after extraction had already run against the stale in-memory AST —
				// serving pre-edit props and persisting them under the fresh content hash.
				existing.refreshFromFileSystemSync()
			} else if (fs.existsSync(file)) {
				proj.addSourceFileAtPath(file)

				structural = true
			}
		}

		// A newly added file can pull in further dependencies; re-resolve so the
		// checker sees the complete graph.
		if (structural) proj.resolveSourceFileDependencies()

		pendingRefresh.clear()
	}

	/** Extract every barrel in canonical order, and map the inputs of each. */
	function fullPass(): void {
		const ctx = extractionContext()

		const directRefs = new Map<string, string[]>()

		for (const barrel of barrels) rebuildBarrel(barrel.key, ctx, directRefs)

		mapped = true

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

	// Re-list barrels against disk before a pass and reconcile the state map: a
	// barrel added since the last pass has no state yet, so mark it dirty to
	// extract it; one removed drops out of both `barrels` and `states`. Keeps a
	// component scaffolded or deleted mid-session from being stranded until
	// restart — `barrels` is otherwise fixed at the initial load.
	function reconcileBarrels(): void {
		barrels = listBarrels(srcDir)

		const keys = new Set(barrels.map((b) => b.key))

		for (const key of keys) if (!states.has(key)) dirty.add(key)

		for (const key of states.keys()) if (!keys.has(key)) states.delete(key)
	}

	function initialLoad(): void {
		barrels = listBarrels(srcDir)

		const disk = cacheDir ? readDisk(cacheDir, fingerprintOf()) : null

		if (disk && disk.hash === aggregateHash(srcDir, hashes)) {
			// Byte-identical source: replay the stored record. No project is opened,
			// so `inputs` stay empty until the first edit forces a full pass.
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

		reconcileBarrels()

		applyRefreshes(proj)

		if (mapped) {
			const ctx = extractionContext()

			const directRefs = new Map<string, string[]>()

			for (const key of dirty) rebuildBarrel(key, ctx, directRefs)

			dirty.clear()

			reindex()

			// A subset pass can differ in order from a full pass (see the type
			// TSDoc), so the disk cache keeps the last full pass. The next start
			// finds the source changed since, and runs a full pass.
			return
		}

		// First in-process pass (the disk cache served the initial load). A
		// cache-replayed state carries empty `inputs`, so a full pass maps them.
		// That costs a once-per-session stall on the first edit. To remove it,
		// run the pass ahead of time from the dev server in `plugins/docs.ts`.
		fullPass()

		reindex()

		persist()
	}

	function persist(): void {
		// Gate the arguments, not the write: both are whole-tree work — the key
		// walks and hashes every input file, and the snapshot copies every barrel —
		// and `writeDisk` would discard them.
		if (cacheDir) writeDisk(cacheDir, fingerprintOf(), aggregateHash(srcDir, hashes), snapshot())
	}

	return {
		getAll() {
			if (!loaded) initialLoad()
			else if (dirty.size > 0 || pendingRefresh.size > 0) incrementalRebuild()

			return snapshot()
		},

		notifyChanged(file) {
			if (!isInputFile(file)) return false

			// One report drops both views of the file — the project's AST and the
			// memo's hash — so the key and the record lag disk by the same set.
			// The AST-side maps key on ts-morph's posix paths (Windows-safe), while
			// the hash memo keys on the platform-native paths the walk produced —
			// same form the watcher reports, so the raw path is the right key there.
			const posix = toPosix(file)

			pendingRefresh.add(posix)

			hashes.delete(file)

			const affected = fileToBarrels.get(posix)

			if (affected) {
				for (const key of affected) dirty.add(key)
			} else {
				// A file no barrel currently reads: a new module an edited import will
				// pull in, a shared file added since the last pass, or a disk-served load
				// whose inputs aren't mapped yet. Re-extract everything; the full pass
				// then maps it precisely.
				for (const { key } of barrels) dirty.add(key)
			}

			return true
		},
	}
}

/** The stored record, when an extractor with `fingerprint` wrote it. */
function readDisk(cacheDir: string, fingerprint: string): DiskCache | null {
	try {
		const raw = fs.readFileSync(path.join(cacheDir, CACHE_FILE), 'utf-8')

		const parsed = JSON.parse(raw) as DiskCache

		return parsed.fingerprint === fingerprint ? parsed : null
	} catch {
		return null
	}
}

function writeDisk(
	cacheDir: string,
	fingerprint: string,
	hash: string,
	record: Record<string, ComponentApi[]>,
): void {
	const payload: DiskCache = { fingerprint, hash, record }

	try {
		fs.mkdirSync(cacheDir, { recursive: true })

		fs.writeFileSync(path.join(cacheDir, CACHE_FILE), JSON.stringify(payload))
	} catch {
		// A read-only or full cache dir is non-fatal: extraction still works, just
		// without cross-restart reuse.
	}
}
