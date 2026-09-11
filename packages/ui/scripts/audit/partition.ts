/**
 * Prints the bug sweep's segment partition, and a hash for each segment and unit.
 *
 * The sweep divides `src` into disjoint units that one agent reads end to end. An
 * agent never derives that division: this script prints it, so coverage stays
 * provable and a reference to a segment stays verifiable.
 *
 * A hash identifies a scope, not a state. It is the first seven hex digits of one
 * SHA-256: the scope's repo-relative paths, sorted and joined by a newline. It
 * therefore moves when the file set moves, and it holds still while the code
 * inside changes. A citation that carries one is checkable: a hash that no longer
 * matches names a scope the partition has since changed, so the citation cannot
 * point silently at the wrong files.
 *
 * Usage: `pnpm --filter ui audit:partition` prints the table, and `--manifests
 * <dir>` also writes one file list for each unit.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const PACKAGE_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')

const REPO_ROOT = join(PACKAGE_ROOT, '..', '..')

/** Lines per unit: what one agent reads end to end without a sample. */
const UNIT_LINES = 4_200

/** Units and lines per segment: what one session closes. */
const SEGMENT_UNITS = 2

const SEGMENT_LINES = 8_600

/** A trailing unit this small folds into the segment before it. */
const FOLD_UNDER_LINES = 2_000

const FOLD_SLACK_LINES = 1_200

/**
 * Segment `A01` predates the partition, so its file set is recorded rather than
 * derived. It took three component directories whole, plus these `pdf-viewer`
 * files; the other 15 stay with the **media-canvas** theme.
 */
const A01_WHOLE_DIRS = [
	'src/components/date-picker',
	'src/components/menu',
	'src/components/segment',
]

const A01_PDF_VIEWER_FILES = [
	'index.ts',
	'pdf-viewer-document-cache.ts',
	'pdf-viewer-highlight-geometry.ts',
	'pdf-viewer-highlights-context.ts',
	'pdf-viewer-highlights.tsx',
	'pdf-viewer-magnifier-context.ts',
	'pdf-viewer-magnifier-settings.tsx',
	'pdf-viewer-magnifier.tsx',
	'pdf-viewer-thumbnails.tsx',
	'pdf-viewer-toolbar-button.tsx',
	'pdf-viewer-utilities.ts',
	'pdf-viewer-viewport.tsx',
	'pdf-viewer-zoom-controls.tsx',
	'types.ts',
	'use-pdf-viewer-highlights.ts',
	'use-pdf-viewer-page-rotation.ts',
].map((name) => `src/components/pdf-viewer/${name}`)

/** Component directories grouped into themes, so a segment reads one kind of surface. */
const COMPONENT_THEMES: Record<string, string[]> = {
	calendar: ['calendar', 'date-picker'],
	'data-display': [
		'table',
		'pivot-table',
		'list',
		'tree',
		'json-tree',
		'kanban',
		'timeline',
		'dl',
		'stat',
		'pagination',
	],
	feedback: [
		'alert',
		'banner',
		'badge',
		'progress',
		'loading',
		'placeholder',
		'status',
		'toast',
		'copy-button',
		'time-ago',
		'shiny-text',
	],
	'form-control': [
		'form',
		'fieldset',
		'control',
		'button',
		'checkbox',
		'radio',
		'switch',
		'toggle-icon-button',
		'rating',
		'slider',
		'stepper',
		'hold-button',
	],
	'layout-leaf': [
		'box',
		'flex',
		'stack',
		'container',
		'spacer',
		'divider',
		'card',
		'group',
		'aspect-ratio',
		'heading',
		'text',
		'icon',
		'kbd',
		'code',
		'link',
		'markdown',
		'avatar',
	],
	'media-canvas': [
		'pdf-viewer',
		'file-upload',
		'signature-pad',
		'color',
		'swatch',
		'sparkline',
		'odometer',
	],
	navigation: [
		'tabs',
		'accordion',
		'collapse',
		'nav',
		'breadcrumb',
		'sidebar',
		'toolbar',
		'split',
		'resizable',
		'scroll-area',
	],
	overlay: [
		'dialog',
		'sheet',
		'drawer',
		'popover',
		'tooltip',
		'context-menu',
		'confirm',
		'command-palette',
	],
	selection: ['combobox', 'listbox', 'select', 'filters', 'tag-input'],
	'text-input': [
		'input',
		'textarea',
		'search-input',
		'password-input',
		'password-confirm',
		'password-strength',
		'mask-input',
		'currency-input',
		'number-input',
		'zipcode-input',
		'phone-input',
		'credit-card-input',
		'address-input',
		'date-input',
	],
	'zz-swept': ['menu', 'segment'],
}

const THEME_OF_COMPONENT = new Map<string, string>()

for (const [theme, dirs] of Object.entries(COMPONENT_THEMES)) {
	for (const dir of dirs) THEME_OF_COMPONENT.set(dir, theme)
}

/** Areas in the order the ledger lists them. */
const AREA_ORDER = [
	'components',
	'modules/grid',
	'modules/chart',
	'modules/map',
	'modules/other',
	'hooks',
	'primitives',
	'foundation',
	'recipes',
	'docs',
]

type SourceFile = { path: string; lines: number }

type Unit = {
	area: string
	theme: string
	part: number
	of: number
	lines: number
	files: string[]
}

type Segment = {
	id: string
	area: string
	hash: string
	files: number
	lines: number
	units: (Unit & { id: string; hash: string })[]
}

/** Every `.ts` and `.tsx` outside a test or benchmark tree, with its line count. */
function sourceFiles(): SourceFile[] {
	const out: SourceFile[] = []

	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === '__tests__' || entry.name === '__benchmarks__') continue

			const full = join(dir, entry.name)

			if (entry.isDirectory()) {
				walk(full)

				continue
			}

			if (!/\.tsx?$/.test(entry.name)) continue

			const path = relative(PACKAGE_ROOT, full)

			out.push({ path, lines: readFileSync(full, 'utf8').split('\n').length - 1 })
		}
	}

	walk(join(PACKAGE_ROOT, 'src'))

	return out
}

/** The first 7 hex of the SHA-256 of the sorted, repo-relative paths. */
function scopeHash(paths: string[]): string {
	const repoPaths = paths.map((path) => relative(REPO_ROOT, join(PACKAGE_ROOT, path))).sort()

	return createHash('sha256').update(repoPaths.join('\n')).digest('hex').slice(0, 7)
}

type Scope = { area: string; theme: string }

const FOUNDATION: Scope = { area: 'foundation', theme: 'core+utilities+types' }

/**
 * One resolver for each first segment under `src`, keyed by that segment. A
 * subtree with no entry is unmapped, and {@link themeOf} throws on it rather
 * than drop the file, because a dropped file would leave a hole in the sweep.
 */
const SCOPE_OF_TOP: Record<string, (top: string, second: string, third: string) => Scope> = {
	components: (_top, second) => {
		const theme = THEME_OF_COMPONENT.get(second)

		if (!theme) throw new Error(`unmapped component directory: ${second}`)

		return { area: 'components', theme }
	},
	modules: (_top, second, third) => {
		if (second !== 'grid' && second !== 'chart' && second !== 'map') {
			return { area: 'modules/other', theme: 'chat+query' }
		}

		return {
			area: `modules/${second}`,
			theme: third === 'engine' ? `${second}/engine` : `${second}/surface`,
		}
	},
	docs: (_top, second) => ({ area: 'docs', theme: second === 'demos' ? 'demos' : 'engine' }),
	hooks: (_top, second) => ({
		area: 'hooks',
		theme: second === 'a11y' ? 'hooks/a11y' : 'hooks/core',
	}),
	recipes: (_top, second) => ({ area: 'recipes', theme: `recipes/${second}` }),
	core: () => FOUNDATION,
	utilities: () => FOUNDATION,
	types: () => FOUNDATION,
	primitives: (top) => ({ area: 'primitives', theme: top }),
	providers: (top) => ({ area: 'primitives', theme: top }),
	layouts: (top) => ({ area: 'primitives', theme: top }),
}

function themeOf(path: string): Scope {
	// A default keeps each segment a `string` under `noUncheckedIndexedAccess`; an
	// empty one maps to no resolver and falls through to the throw below.
	const [, top = '', second = '', third = ''] = path.split('/')

	const resolve = SCOPE_OF_TOP[top]

	if (!resolve) throw new Error(`unmapped path: ${path}`)

	return resolve(top, second, third)
}

type Bucket = { lines: number; files: SourceFile[] }

/** A `solo` chunk holds one slice of a split directory, so no other directory joins it. */
type Chunk = Bucket & { solo?: boolean }

/** Groups the files of one theme by the directory that holds them. */
function bucketsByDirectory(files: SourceFile[]): Bucket[] {
	const byDir = new Map<string, Bucket>()

	for (const file of files) {
		const dir = file.path.slice(0, file.path.lastIndexOf('/'))

		const bucket = byDir.get(dir) ?? { lines: 0, files: [] }

		bucket.files.push(file)

		bucket.lines += file.lines

		byDir.set(dir, bucket)
	}

	return [...byDir.values()]
}

/**
 * Splits one oversized directory into `solo` chunks, in file-name order, and
 * appends them to `chunks`. The order makes a part reproducible as a name range;
 * the `1.18` slack lets a large file overshoot the even slice rather than open a
 * part for itself, and the `parts - 1` guard holds the count at the target.
 */
function splitOversizedDirectory(bucket: Bucket, chunks: Chunk[]): void {
	bucket.files.sort((a, b) => a.path.localeCompare(b.path))

	const parts = Math.ceil(bucket.lines / UNIT_LINES)

	const per = bucket.lines / parts

	let bin: Chunk = { lines: 0, files: [], solo: true }

	for (const file of bucket.files) {
		const full = bin.lines > 0 && bin.lines + file.lines > per * 1.18

		if (full && chunks.filter((chunk) => chunk.solo).length < parts - 1) {
			chunks.push(bin)

			bin = { lines: 0, files: [], solo: true }
		}

		bin.files.push(file)

		bin.lines += file.lines
	}

	chunks.push(bin)
}

/** Splits one theme into units, and an oversized directory by file name. */
function unitsOfTheme(area: string, theme: string, files: SourceFile[]): Unit[] {
	const chunks: Chunk[] = []

	// Largest directory first, so a first-fit pass leaves the small tails to pad
	// the chunks the big directories opened.
	for (const bucket of bucketsByDirectory(files).sort((a, b) => b.lines - a.lines)) {
		if (bucket.lines > UNIT_LINES) {
			splitOversizedDirectory(bucket, chunks)

			continue
		}

		const open = chunks.find((chunk) => chunk.lines + bucket.lines <= UNIT_LINES && !chunk.solo)

		const chunk = open ?? { lines: 0, files: [] }

		if (!open) chunks.push(chunk)

		chunk.files.push(...bucket.files)

		chunk.lines += bucket.lines
	}

	return chunks.map((chunk, index) => ({
		area,
		theme,
		part: index + 1,
		of: chunks.length,
		lines: chunk.lines,
		files: chunk.files.map((file) => file.path).sort(),
	}))
}

type Group = { area: string; units: Unit[] }

const lineCount = (units: Unit[]) => units.reduce((sum, unit) => sum + unit.lines, 0)

/** The file set of `A01`, which predates the partition and is recorded, not derived. */
function a01PathSet(all: SourceFile[]): Set<string> {
	const whole = all
		.filter((file) => A01_WHOLE_DIRS.some((dir) => file.path.startsWith(`${dir}/`)))
		.map((file) => file.path)

	return new Set([...whole, ...A01_PDF_VIEWER_FILES])
}

/** Splits every theme of the tree into units, theme by theme. */
function unitsOfTree(files: SourceFile[]): Unit[] {
	const byTheme = new Map<string, { area: string; theme: string; files: SourceFile[] }>()

	for (const file of files) {
		const { area, theme } = themeOf(file.path)

		const group = byTheme.get(`${area}|${theme}`) ?? { area, theme, files: [] }

		group.files.push(file)

		byTheme.set(`${area}|${theme}`, group)
	}

	return [...byTheme.values()].flatMap((group) =>
		unitsOfTheme(group.area, group.theme, group.files),
	)
}

/**
 * Packs the units of one area into segments, in theme order. A segment takes up
 * to {@link SEGMENT_UNITS} units and {@link SEGMENT_LINES} lines, and a lone
 * trailing unit under {@link FOLD_UNDER_LINES} folds back into the segment before
 * it, so the round does not end on a segment too small to be worth a session.
 */
function segmentsOfArea(area: string, areaUnits: Unit[]): Group[] {
	const segments: Group[] = []

	for (const unit of areaUnits) {
		const last = segments.at(-1)

		const fits = last && last.units.length < SEGMENT_UNITS
		const room = last && lineCount(last.units) + unit.lines <= SEGMENT_LINES

		if (last && fits && room) last.units.push(unit)
		else segments.push({ area, units: [unit] })
	}

	const tail = segments.at(-1)

	const prev = segments.at(-2)

	if (!tail || !prev || tail.units.length !== 1) return segments

	const tailLines = lineCount(tail.units)

	if (tailLines >= FOLD_UNDER_LINES) return segments

	if (lineCount(prev.units) + tailLines > SEGMENT_LINES + FOLD_SLACK_LINES) return segments

	prev.units.push(...tail.units)

	segments.pop()

	return segments
}

function partition(): Segment[] {
	const all = sourceFiles()

	const a01Paths = a01PathSet(all)

	const a01Files = all.filter((file) => a01Paths.has(file.path))

	const units = unitsOfTree(all.filter((file) => !a01Paths.has(file.path)))

	const byArea = new Map<string, Unit[]>()

	for (const unit of units) byArea.set(unit.area, [...(byArea.get(unit.area) ?? []), unit])

	const grouped = AREA_ORDER.flatMap((area) =>
		segmentsOfArea(
			area,
			(byArea.get(area) ?? []).sort((a, b) => a.theme.localeCompare(b.theme) || a.part - b.part),
		),
	)

	const withA01: Group[] = [
		{
			area: 'components',
			units: [
				{
					area: 'components',
					theme: 'swept before the partition',
					part: 1,
					of: 1,
					lines: a01Files.reduce((sum, file) => sum + file.lines, 0),
					files: a01Files.map((file) => file.path).sort(),
				},
			],
		},
		...grouped,
	]

	return withA01.map((segment, index) => {
		const files = segment.units.flatMap((unit) => unit.files)

		const id = `A${String(index + 1).padStart(2, '0')}`

		return {
			id,
			area: segment.area,
			hash: scopeHash(files),
			files: files.length,
			lines: segment.units.reduce((sum, unit) => sum + unit.lines, 0),
			units: segment.units.map((unit, unitIndex) => ({
				...unit,
				id: `${id}-u${unitIndex + 1}`,
				hash: scopeHash(unit.files),
			})),
		}
	})
}

const segments = partition()

const manifestFlag = process.argv.indexOf('--manifests')

const manifestDir = manifestFlag === -1 ? undefined : process.argv[manifestFlag + 1]

if (manifestDir) {
	mkdirSync(manifestDir, { recursive: true })

	for (const segment of segments) {
		for (const unit of segment.units)
			writeFileSync(join(manifestDir, `${unit.id}.txt`), `${unit.files.join('\n')}\n`)
	}
}

const fmt = (value: number) => value.toLocaleString('en-US')

console.log('| Segment | Hash | Area | Scope | Files | Lines |')
console.log('|---|---|---|---|---|---|')

for (const segment of segments) {
	const scope = segment.units
		.map((unit) => `${unit.theme}${unit.of > 1 ? ` ${unit.part}/${unit.of}` : ''}`)
		.join(' + ')

	console.log(
		`| \`${segment.id}\` | \`${segment.hash}\` | ${segment.area} | ${scope} | ${segment.files} | ${fmt(segment.lines)} |`,
	)
}

const files = segments.reduce((sum, segment) => sum + segment.files, 0)

const lines = segments.reduce((sum, segment) => sum + segment.lines, 0)

const units = segments.reduce((sum, segment) => sum + segment.units.length, 0)

console.log(`\n${segments.length} segments · ${units} units · ${files} files · ${fmt(lines)} lines`)

// `Lines` is the count in the tree now; the plan ledger records the count at the
// partition, so a later fix makes the two differ. `Hash` and `Files` are what must
// match, because the hash reads the paths and not the content.
console.log('`Lines` is live; the plan ledger records the count at the partition.\n')

for (const segment of segments) {
	for (const unit of segment.units)
		console.log(
			`${unit.id} ${unit.hash} ${unit.files.length}f ${unit.lines}L ${unit.theme} ${unit.part}/${unit.of}`,
		)
}
