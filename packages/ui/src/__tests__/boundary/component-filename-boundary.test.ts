import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkFolder, listLeafFolders } from '../helpers/filename-rules'
import { srcDir } from '../helpers/walk-source'

// Enforces the file-naming convention documented in CLAUDE.md → "File naming"
// for the components tree. Feature modules follow the same grammar plus the
// engine layout, enforced by `module-filename-boundary.test.ts`.
//
// Every `.ts` / `.tsx` file in a component folder must be one of:
//
//   - the main component file:   `<folder>.tsx`
//   - a prefixed sub-file:       `<folder>-<part>.tsx` (or singular stem when folder is plural)
//   - a prefixed hook:           `use-<folder>.ts(x)` or `use-<folder>-<hook>.ts(x)`
//                                (singular stem also accepted when folder is plural)
//   - a permitted bare file:     `index.ts(x)`, `types.ts`, `context.ts(x)`, `slots.ts(x)`,
//                                `variants.ts`
//
// In addition, every component / hook file must export a symbol whose
// PascalCase (or `useCamelCase`) form matches its kebab-case filename:
// `tag-input-badge.tsx` exports `TagInputBadge`, `use-tag-input-keyboard.ts`
// exports `useTagInputKeyboard`. Catches the case where a file is renamed but
// its exported component or hook keeps the old, now-divergent name.

const componentsDir = join(srcDir, 'components')

// Grandfathered files where renaming would break a stable public API
// (`Field`, `Label`, etc.). Never extend this list for new files; fix the
// file or fix the export.
const ALLOWLIST = new Set([
	'dl/description-details.tsx',
	'dl/description-list.tsx',
	'dl/description-term.tsx',
	'fieldset/description.tsx',
	'fieldset/field.tsx',
	'fieldset/label.tsx',
	'fieldset/legend.tsx',
	'fieldset/message.tsx',
])

describe('component filename boundary', () => {
	const folders = listLeafFolders(componentsDir)

	const violations = folders.flatMap((folder) =>
		checkFolder(folder, basename(folder), componentsDir),
	)

	const newViolations = violations.filter((v) => !ALLOWLIST.has(v.path))

	const violationPaths = new Set(violations.map((v) => v.path))

	const staleEntries = [...ALLOWLIST].filter((p) => !violationPaths.has(p))

	it('every component file matches the filename convention', () => {
		expect(
			newViolations,
			`filename violation(s) in packages/ui/src/components — see CLAUDE.md → "File naming":\n${newViolations
				.map((v) => `  ${v.path}\n    ${v.reason}`)
				.join('\n')}`,
		).toEqual([])
	})

	it('the allowlist does not contain stale entries', () => {
		expect(
			staleEntries,
			`stale allowlist entry/ies (file no longer exists or no longer violates) — remove them from ALLOWLIST:\n${staleEntries
				.map((p) => `  ${p}`)
				.join('\n')}`,
		).toEqual([])
	})
})
