import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// Static leaves are the library's server-renderable surface: no 'use client'
// directive, no React hooks, no ambient-context reads (the boundary
// contract in packages/ui/REFERENCE.md §2). This test pins the contract at
// the source level, where a regression (a context read quietly turning a
// leaf back into a client component) produces no build error.
//
// Coverage comes from two mechanisms that never overlap:
//
//   - STATIC_COMPONENT_FILES below is the curated list of declared static
//     *atoms* (box, text, table parts, inert display leaves). It's a
//     deliberate contract, not "every hookless file" — most component files
//     that read no context are only incidentally hookless composition
//     wrappers whose interactivity lives in their children, and those are
//     not server-renderable leaves. Add a file when a component becomes a
//     genuine static leaf; never remove one to silence this test.
//   - Every `*-skeleton.{ts,tsx}` is scanned automatically. Skeleton
//     variants are static by definition (CONVENTIONS §3.7), a closed set
//     discoverable by filename, so the scan needs no list and can't drift as
//     new skeletons land. Do not add skeleton files to the curated list —
//     the scan already owns them.
//
// Curated paths are relative to `src/components`.
const STATIC_COMPONENT_FILES = [
	'alert/alert-body.tsx',
	'alert/alert-description.tsx',
	'alert/alert-title.tsx',
	'aspect-ratio/aspect-ratio.tsx',
	'avatar/avatar.tsx',
	'avatar/avatar-group.tsx',
	'badge/badge.tsx',
	'banner/banner.tsx',
	'box/box.tsx',
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
	'container/container.tsx',
	'divider/divider.tsx',
	'dl/description-details.tsx',
	'dl/description-list.tsx',
	'dl/description-term.tsx',
	'fieldset/fieldset.tsx',
	'fieldset/legend.tsx',
	'flex/flex.tsx',
	'heading/heading.tsx',
	'icon/icon.tsx',
	'kbd/kbd.tsx',
	'loading/loading-dots.tsx',
	'loading/loading-spinner.tsx',
	'placeholder/placeholder.tsx',
	'spacer/spacer.tsx',
	'split/split.tsx',
	'stack/stack.tsx',
	'stat/stat-delta.tsx',
	'stat/stat-description.tsx',
	'stat/stat-label.tsx',
	'stat/stat-value.tsx',
	'status/status-dot.tsx',
	'swatch/swatch.tsx',
	'table/table.tsx',
	'table/table-body.tsx',
	'table/table-cell.tsx',
	'table/table-empty.tsx',
	'table/table-head.tsx',
	'table/table-header.tsx',
	'table/table-loading.tsx',
	'table/table-row.tsx',
	'text/text.tsx',
] as const

const componentsDir = join(srcDir, 'components')

const modulesDir = join(srcDir, 'modules')

// Ambient-context sources a static leaf must not import. `primitives/link`
// and `primitives/polymorphic`'s client export read LinkContext;
// `primitives/density` and `primitives/affix` are the density cascade;
// `providers/*` are ambient by definition; `motion/react` forces a client
// module. Type-only imports are fine: TypeScript erases them. Two value
// exemptions: `providers/density/context` is a directive-free constants
// module (the DensityLevel vocabulary), not a context; and the bare
// `Density` broadcast component, which renders a client boundary around
// children without making the host read anything — a static host may
// *open* a density scope (Card does, for an explicit `size`), it may never
// *read* the cascade, which the hook scan below still catches.
const BANNED_IMPORT_SOURCES = [
	/^import (?!type[\s{])[^'"]*['"][^'"]*\/providers\/(?!density\/context['"])/m,
	/^import (?!type[\s{])(?!\{ Density \} from )[^'"]*['"][^'"]*\/primitives\/density['"]/m,
	/^import (?!type[\s{])[^'"]*['"][^'"]*\/primitives\/affix['"]/m,
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
 * Return one human-readable reason per way `content` breaches the static
 * contract, or an empty array when the file is server-renderable. Shared by
 * the curated-list check and the skeleton scan so both enforce the same
 * rules.
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

describe('static component boundary', () => {
	it.each(STATIC_COMPONENT_FILES)('%s stays server-renderable', (file) => {
		const breaches = staticBreaches(readFileSync(join(componentsDir, file), 'utf8'))

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

	it('every skeleton variant stays server-renderable', () => {
		const violations = collectSkeletonFiles().flatMap((path) => {
			const breaches = staticBreaches(readFileSync(path, 'utf8'))

			return breaches.length ? [`${relative(srcDir, path)}: ${breaches.join(', ')}`] : []
		})

		expect(
			violations,
			`skeleton variants must stay static (CONVENTIONS §3.7):\n${violations
				.map((v) => `  ${v}`)
				.join('\n')}`,
		).toEqual([])
	})
})
