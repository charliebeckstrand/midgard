import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Static leaves are the library's server-renderable surface: no 'use client'
// directive, no React hooks, no ambient-context imports (the boundary
// contract in packages/ui/REFERENCE.md §2). This test pins the contract at
// the source level, where a regression (a context read quietly turning a
// leaf back into a client component) produces no build error.
//
// Add a file when a component sheds its context reads; never remove one to
// silence this test. Paths are relative to `src/components`.
const STATIC_COMPONENT_FILES = [
	'avatar/avatar.tsx',
	'avatar/avatar-group.tsx',
	'avatar/avatar-skeleton.tsx',
	'badge/badge.tsx',
	'badge/badge-skeleton.tsx',
	'banner/banner.tsx',
	'box/box.tsx',
	'breadcrumb/breadcrumb.tsx',
	'breadcrumb/breadcrumb-link.tsx',
	'breadcrumb/breadcrumb-list.tsx',
	'breadcrumb/breadcrumb-separator.tsx',
	'button/button-skeleton.tsx',
	'card/card.tsx',
	'card/card-body.tsx',
	'card/card-description.tsx',
	'card/card-footer.tsx',
	'card/card-header.tsx',
	'card/card-title.tsx',
	'checkbox/checkbox-skeleton.tsx',
	'color/color-panel-skeleton.tsx',
	'control/control-skeleton.tsx',
	'divider/divider.tsx',
	'dl/description-details.tsx',
	'dl/description-list.tsx',
	'dl/description-term.tsx',
	'fieldset/legend.tsx',
	'flex/flex.tsx',
	'grid/grid.tsx',
	'heading/heading.tsx',
	'heading/heading-skeleton.tsx',
	'icon/icon.tsx',
	'kbd/kbd.tsx',
	'loading/loading-dots.tsx',
	'loading/loading-spinner.tsx',
	'placeholder/placeholder.tsx',
	'placeholder/placeholder-skeleton.ts',
	'radio/radio-skeleton.tsx',
	'shiny-text/shiny-text-skeleton.tsx',
	'split/split.tsx',
	'stack/stack.tsx',
	'stat/stat-delta.tsx',
	'stat/stat-delta-skeleton.tsx',
	'stat/stat-description.tsx',
	'stat/stat-description-skeleton.tsx',
	'stat/stat-label.tsx',
	'stat/stat-label-skeleton.tsx',
	'stat/stat-value.tsx',
	'stat/stat-value-skeleton.tsx',
	'status/status-dot.tsx',
	'switch/switch-skeleton.tsx',
	'table/table.tsx',
	'table/table-body.tsx',
	'table/table-cell.tsx',
	'table/table-empty.tsx',
	'table/table-head.tsx',
	'table/table-header.tsx',
	'table/table-loading.tsx',
	'table/table-row.tsx',
	'text/text.tsx',
	'text/text-skeleton.tsx',
	'textarea/textarea-skeleton.tsx',
] as const

const componentsDir = join(__dirname, '../../../components')

// Ambient-context sources a static leaf must not import. `primitives/link`
// and `primitives/polymorphic`'s client export read LinkContext;
// `primitives/density` and `primitives/affix` are the density cascade;
// `providers/*` are ambient by definition; `motion/react` forces a client
// module. Type-only imports are fine: TypeScript erases them. One value
// exemption: `providers/density/context` is a directive-free constants
// module (the DensityLevel vocabulary), not a context.
const BANNED_IMPORT_SOURCES = [
	/^import (?!type[\s{])[^'"]*['"][^'"]*\/providers\/(?!density\/context['"])/m,
	/^import (?!type[\s{])[^'"]*['"][^'"]*\/primitives\/density['"]/m,
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

describe('static component boundary', () => {
	it.each(STATIC_COMPONENT_FILES)('%s stays server-renderable', (file) => {
		const content = readFileSync(join(componentsDir, file), 'utf8')

		expect(content, `${file} carries 'use client'`).not.toMatch(/^['"]use client['"]/)

		expect(content, `${file} calls a hook`).not.toMatch(HOOK_CALL)

		expect(content, `${file} imports the client Polymorphic`).not.toMatch(CLIENT_POLYMORPHIC)

		for (const banned of BANNED_IMPORT_SOURCES) {
			expect(content, `${file} imports an ambient-context module (${banned})`).not.toMatch(banned)
		}
	})
})
