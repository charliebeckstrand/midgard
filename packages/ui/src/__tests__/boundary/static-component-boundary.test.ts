import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runtimeFiles } from '../helpers/import-graph'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Static leaves are the library's server-renderable surface: no 'use client'
// directive, no React hooks, no ambient-context reads (the boundary
// contract in packages/ui/REFERENCE.md §2). This test pins the contract at
// the source level, where a regression (a context read quietly turning a
// leaf back into a client component) produces no build error.
//
// The walk starts from three sets of static files:
//
//   - STATIC_COMPONENT_FILES below is the curated list of declared static
//     *atoms* (text, table parts, inert display leaves). It's a
//     deliberate contract, not "every hookless file": most component files
//     that read no context are only incidentally hookless composition
//     wrappers whose interactivity lives in their children, and those are
//     not server-renderable leaves. Add a file when a component becomes a
//     genuine static leaf; never remove one to silence this test.
//   - Each `*-skeleton.{ts,tsx}` file. A skeleton variant is static by
//     definition (CONVENTIONS §3.7), and its file name finds it, so the set
//     needs no list and does not drift as new skeletons land. Do not add a
//     skeleton file to the curated list.
//   - Each source file under `structure`. The folder holds only static layout
//     units, so it needs no list either.
//
// Two sets can reach the same file, such as a skeleton that imports a curated
// leaf. The walk checks each file once.
//
// A leaf is only as server-renderable as what it imports. So the gate walks
// the runtime imports from each static file, and applies the same checks to
// each file that the walk reaches, such as `PolymorphicStatic`. A file with
// `'use client'` is a client boundary that a server module can render, so the
// walk stops there. The checks of the import sources below decide which
// boundaries a static file may cross.
//
// Curated paths are relative to `src/components`.
const STATIC_COMPONENT_FILES = [
	'alert/alert-body.tsx',
	'aspect-ratio/aspect-ratio.tsx',
	'avatar/avatar.tsx',
	'avatar/avatar-group.tsx',
	'badge/badge.tsx',
	'banner/banner.tsx',
	'breadcrumb/breadcrumb.tsx',
	'breadcrumb/breadcrumb-item.tsx',
	'breadcrumb/breadcrumb-link.tsx',
	'breadcrumb/breadcrumb-list.tsx',
	'breadcrumb/breadcrumb-separator.tsx',
	'card/card.tsx',
	'card/card-body.tsx',
	'card/card-description.tsx',
	'card/card-footer.tsx',
	'card/card-header.tsx',
	'card/card-title.tsx',
	'code/code.tsx',
	'divider/divider.tsx',
	'description-list/description-details.tsx',
	'description-list/description-list.tsx',
	'description-list/description-term.tsx',
	'fieldset/fieldset.tsx',
	'fieldset/legend.tsx',
	'group/group.tsx',
	'heading/heading.tsx',
	'icon/icon.tsx',
	'kbd/kbd.tsx',
	'loading/loading-dots.tsx',
	'loading/loading-spinner.tsx',
	'placeholder/placeholder.tsx',
	'stat/stat-delta.tsx',
	'stat/stat-description.tsx',
	'stat/stat-label.tsx',
	'stat/stat-value.tsx',
	'status/status-dot.tsx',
	'swatch/swatch.tsx',
	'table/table.tsx',
	'table/table-body.tsx',
	'table/table-caption.tsx',
	'table/table-cell.tsx',
	'table/table-empty.tsx',
	'table/table-foot.tsx',
	'table/table-head.tsx',
	'table/table-header.tsx',
	'table/table-loading.tsx',
	'table/table-row.tsx',
	'text/text.tsx',
] as const

const componentsDir = join(srcDir, 'components')

const structureDir = join(srcDir, 'structure')

/**
 * Every source file under `structure`. Each one is static: layout scaffolding
 * takes props and returns markup. The scan reads the whole folder, so a new
 * unit needs no entry.
 */
function collectStructureFiles(): string[] {
	const files: string[] = []

	walkSource(structureDir, (path) => {
		if (isSourceFile(path)) files.push(path)
	})

	return files.sort()
}

const modulesDir = join(srcDir, 'modules')

// Ambient-context sources a static leaf must not import. `primitives/link`
// and `primitives/polymorphic`'s client export read LinkContext;
// `primitives/density` holds the density context; `providers/*` are ambient by
// definition; `motion/react` forces a client module. Type-only imports are fine:
// TypeScript erases them. One value exemption: the bare `Density` scope
// component, which renders a client boundary around children without making the
// host read anything. The `density` prop of PolymorphicStatic uses it, so a
// static host may *open* a density scope. A static host may never *read* the
// context, and the hook scan below still catches a read. A primitive imports
// its siblings as `../density`, so the density source matches that form too.
const BANNED_IMPORT_SOURCES = [
	/^import (?!type[\s{])[^'"]*['"][^'"]*\/providers\//m,
	/^import (?!type[\s{])(?!\{ Density \} from )[^'"]*['"][^'"]*(?:\/primitives|\.\.)\/density['"]/m,
	/^import (?!type[\s{])[^'"]*['"][^'"]*\/primitives\/link['"]/m,
	/^import [^'"]*['"]motion\/react['"]/m,
]

// React hook usage: any call spelled like a hook. Static leaves take props
// and return markup; resolution happens in CSS or at the call site.
const HOOK_CALL = /\buse[A-Z]\w*\(/

// The client Polymorphic reads LinkContext; static leaves use
// PolymorphicStatic. `\bPolymorphic\b` does not match `PolymorphicStatic`
// (no word boundary between `c` and `S`).
const CLIENT_POLYMORPHIC = /import \{[^}]*(?<!Static)\bPolymorphic\b(?!Static)[^}]*\}/

// Matches a skeleton variant by filename. `.ts` covers the rare non-JSX
// skeleton (placeholder), `.tsx` the rest.
const SKELETON_FILE = /-skeleton\.tsx?$/

/**
 * One reason for each way that `content` breaks the static contract, or an
 * empty array when the file is server-renderable. The gate applies it to each
 * file that the walk reaches.
 */
function staticBreaches(content: string): string[] {
	const reasons: string[] = []

	if (/^['"]use client['"]/.test(content)) reasons.push("carries 'use client'")

	if (HOOK_CALL.test(content)) reasons.push('calls a hook')

	if (CLIENT_POLYMORPHIC.test(content)) reasons.push('imports the client Polymorphic')

	for (const banned of BANNED_IMPORT_SOURCES) {
		if (banned.test(content)) reasons.push(`imports an ambient-context module (${banned})`)
	}

	return reasons
}

/** Every `*-skeleton.{ts,tsx}` under `components/` and `modules/`. */
function collectSkeletonFiles(): string[] {
	const files: string[] = []

	for (const root of [componentsDir, modulesDir]) {
		walkSource(root, (path) => {
			if (SKELETON_FILE.test(path)) files.push(path)
		})
	}

	return files.sort()
}

/** Whether a source is a client boundary: a module that opens with `'use client'`. */
function isClient(_file: string, source: string): boolean {
	return /^['"]use client['"]/.test(source)
}

/**
 * Each static file and each file that its runtime imports reach, up to a
 * client boundary, relative to `src`. The curated leaves, the structure units,
 * and the skeletons start the walk. A start file stays in the result even when
 * it is a client module, so its directive fails the check.
 */
function collectStaticGraph(): string[] {
	const entries = [
		...STATIC_COMPONENT_FILES.map((file) => join(componentsDir, file)),
		...collectStructureFiles(),
		...collectSkeletonFiles(),
	]

	return [...runtimeFiles(entries, isClient)].map(srcRelative).sort()
}

describe('static component boundary', () => {
	it.for(collectStaticGraph())('%s stays server-renderable', (file) => {
		const breaches = staticBreaches(readFileSync(join(srcDir, file), 'utf8'))

		expect(breaches, `${file}: ${breaches.join(', ')}`).toEqual([])
	})

	it('the curated static list has no stale entries', () => {
		const missing = STATIC_COMPONENT_FILES.filter((file) => !existsSync(join(componentsDir, file)))

		expect(
			missing,
			`static list entry/ies point to files that no longer exist — remove them:\n${missing
				.map((file) => `  ${file}`)
				.join('\n')}`,
		).toEqual([])
	})
})
