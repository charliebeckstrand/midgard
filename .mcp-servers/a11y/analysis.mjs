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

// Resolved once at construction from the repo root passed by the caller.
export function createAnalysis(repoRoot) {
	const uiSrc = join(repoRoot, 'packages', 'ui', 'src')
	const componentsDir = join(uiSrc, 'components')
	const casesDir = join(uiSrc, '__tests__', 'a11y', 'cases')

	// Corpus buckets → the case source files that populate them. `baseline`
	// aggregates the per-category files (see cases/baseline.ts); the rest are a
	// single export each (cases/index.ts).
	const BUCKET_FILES = {
		baseline: [
			'content.tsx',
			'inputs.tsx',
			'forms.tsx',
			'navigation.tsx',
			'data-display.tsx',
			'data-complex.tsx',
			'layout.tsx',
			'feedback.tsx',
			'specialized.tsx',
		],
		overlays: ['overlays.tsx'],
		interactive: ['interactive.tsx'],
		focus: ['focus.tsx'],
		traps: ['traps.tsx'],
	}

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
