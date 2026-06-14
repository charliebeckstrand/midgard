// Static analysis of the packages/ui accessibility corpus.
//
// The a11y gates assert against a hand-authored corpus of canonical renders
// (`src/__tests__/a11y/cases/*`). Every case file imports the components it
// exercises from `../../../components/<dir>`, so corpus membership — and thus
// which gate asserts a component — is recoverable from import specifiers alone,
// with no rendering. The display-name strings on each case tuple are free-form
// ("input in field", "file upload (area)") and are deliberately not used for
// the component mapping.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Sibling modules a case file may import that are not themselves cases —
// excluded when deriving a bucket's constituent files.
const NON_CASE = new Set(['types', 'harness', 'helpers', 'index'])

// Resolves a case module name to its on-disk file (tsx preferred), or null.
function resolveCaseFile(casesDir, name) {
	for (const ext of ['.tsx', '.ts']) {
		if (existsSync(join(casesDir, `${name}${ext}`))) return `${name}${ext}`
	}
	return null
}

// The sibling case files a module pulls in via `./<name>` imports (e.g.
// baseline.ts importing ./content, ./inputs, …), excluding non-case modules.
function siblingCaseFiles(casesDir, file) {
	const src = readFileSync(join(casesDir, file), 'utf8')
	const out = new Set()
	for (const m of src.matchAll(/from\s*['"]\.\/([\w-]+)['"]/g)) {
		if (NON_CASE.has(m[1])) continue
		const resolved = resolveCaseFile(casesDir, m[1])
		if (resolved && resolved !== file) out.add(resolved)
	}
	return [...out]
}

// Bucket → case files, derived from the corpus barrel (cases/index.ts) rather
// than a hardcoded list, so adding a category to baseline.ts (or a new bucket
// export) is tracked automatically instead of silently undercounting coverage.
// Each value re-export `export { <bucket> } from './<module>'` names a bucket; a
// module that aggregates sibling case files (baseline.ts) expands to them, while
// a leaf module that renders components (overlays.tsx, …) is itself the case file.
function discoverBucketFiles(casesDir) {
	const indexSrc = readFileSync(join(casesDir, 'index.ts'), 'utf8')
	const buckets = {}
	for (const m of indexSrc.matchAll(/export\s+\{\s*([A-Za-z0-9_]+)\s*\}\s*from\s*['"]\.\/([\w-]+)['"]/g)) {
		const moduleFile = resolveCaseFile(casesDir, m[2])
		if (!moduleFile) continue
		const siblings = siblingCaseFiles(casesDir, moduleFile)
		buckets[m[1]] = siblings.length ? siblings : [moduleFile]
	}
	// Fail loudly rather than silently reporting every component as a gap if the
	// barrel's export shape changes out from under the deriver.
	if (Object.keys(buckets).length === 0) {
		throw new Error(
			`a11y corpus: no buckets derived from ${join(casesDir, 'index.ts')} — expected \`export { <bucket> } from './<module>'\` re-exports.`,
		)
	}
	return buckets
}

// Resolved once at construction from the repo root passed by the caller.
export function createAnalysis(repoRoot) {
	const uiSrc = join(repoRoot, 'packages', 'ui', 'src')
	const componentsDir = join(uiSrc, 'components')
	const casesDir = join(uiSrc, '__tests__', 'a11y', 'cases')

	// Corpus buckets → the case source files that populate them, derived from the
	// barrel (discoverBucketFiles) so the map can't drift from cases/index.ts and
	// cases/baseline.ts as categories or buckets are added.
	const BUCKET_FILES = discoverBucketFiles(casesDir)

	// Gate metadata. `buckets` ties a gate to corpus buckets; `env` and `rules`
	// describe what it can see (CONVENTIONS §10.5). A component is asserted by a
	// gate iff it appears in any of that gate's buckets.
	const GATES = {
		structural: {
			label: 'structural axe (jsdom)',
			env: 'jsdom',
			buckets: ['baseline', 'overlays', 'interactive'],
			file: '__tests__/a11y/baseline.test.tsx',
			rules: 'roles, accessible names, ARIA validity, label association, list/landmark structure',
			wcag: '4.1.2, 1.3.1, 2.4.x',
			runnable: true,
		},
		geometry: {
			label: 'geometry axe (browser/Chromium)',
			env: 'browser',
			buckets: ['baseline', 'overlays', 'interactive'],
			file: '__tests__/browser/a11y-geometry.test.tsx',
			rules: 'color-contrast, target-size',
			wcag: '1.4.3, 1.4.11, 2.5.8',
			runnable: false, // requires Playwright browsers
		},
		focus: {
			label: 'focus management (jsdom)',
			env: 'jsdom',
			buckets: ['focus'],
			file: '__tests__/a11y/focus.test.tsx',
			rules: 'focus moves into a dismissable surface on open and returns to the trigger on dismiss',
			wcag: '2.4.3',
			runnable: true,
		},
		traps: {
			label: 'focus trap (browser/floating-ui)',
			env: 'browser',
			buckets: ['traps'],
			file: '__tests__/browser/floating-ui/trap-corpus.test.tsx',
			rules: 'modal Tab containment and Escape focus restore through the live floating engine',
			wcag: '2.4.3, 2.1.2',
			runnable: false,
		},
	}

	// `landmarks.test.tsx` asserts layout-level landmark/region structure from
	// its own inline cases (Heading/Sidebar/Text/layouts), not a per-component
	// corpus bucket, so it is surfaced as guidance rather than coverage.
	const LANDMARK_GATE = {
		label: 'landmark structure (jsdom)',
		file: '__tests__/a11y/landmarks.test.tsx',
		rules: 'one main, unique/complementary landmarks, region labelling for full layouts',
		wcag: '1.3.1, 2.4.1',
	}

	function listComponents() {
		return readdirSync(componentsDir, { withFileTypes: true })
			.filter((e) => e.isDirectory() && existsSync(join(componentsDir, e.name, 'index.ts')))
			.map((e) => e.name)
			.sort()
	}

	// Component dirs referenced by `components/<dir>` import specifiers in a file.
	const SPECIFIER = /components\/([a-z0-9-]+)/g
	function scanImports(file) {
		const path = join(casesDir, file)
		if (!existsSync(path)) return new Set()
		const src = readFileSync(path, 'utf8')
		const hits = new Set()
		for (const m of src.matchAll(SPECIFIER)) hits.add(m[1])
		return hits
	}

	// bucket → Set(component) memoized.
	let _bucketMembers = null
	function bucketMembers() {
		if (_bucketMembers) return _bucketMembers
		_bucketMembers = {}
		for (const [bucket, files] of Object.entries(BUCKET_FILES)) {
			const members = new Set()
			for (const f of files) for (const c of scanImports(f)) members.add(c)
			_bucketMembers[bucket] = members
		}
		return _bucketMembers
	}

	function gatesFor(buckets) {
		return Object.entries(GATES)
			.filter(([, g]) => g.buckets.some((b) => buckets.includes(b)))
			.map(([id]) => id)
	}

	// Per-component coverage: which buckets contain it and which gates assert it.
	function coverageFor(component) {
		const members = bucketMembers()
		const buckets = Object.keys(BUCKET_FILES).filter((b) => members[b].has(component))
		return { component, buckets, gates: gatesFor(buckets) }
	}

	function coverage() {
		const components = listComponents()
		const rows = components.map(coverageFor)
		const gaps = rows.filter((r) => r.buckets.length === 0).map((r) => r.component)
		return { total: components.length, covered: rows.length - gaps.length, gaps, rows }
	}

	return {
		GATES,
		LANDMARK_GATE,
		BUCKET_FILES,
		listComponents,
		bucketMembers,
		coverageFor,
		coverage,
		gatesFor,
	}
}
