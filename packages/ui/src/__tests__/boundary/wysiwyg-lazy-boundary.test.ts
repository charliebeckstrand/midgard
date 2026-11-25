import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runtimeFiles, runtimePathsTo } from '../helpers/import-graph'
import { parseImports } from '../helpers/source-imports'
import { srcDir, srcRelative } from '../helpers/walk-source'

// A Wysiwyg loads its editor (`wysiwyg-editor.ts`, and with it ProseMirror)
// only through an `import()`, after the field mounts (`use-wysiwyg-editor.ts`).
// Until then, the field draws its doc with the plain parse and the plain markup
// of the engine (`engine/wysiwyg-markdown/doc.ts`, `engine/wysiwyg-dom.ts`),
// which import no ProseMirror. A bundler keeps each static import, so one
// runtime import of the editor or of ProseMirror from the barrel of the module,
// or from `ChatPrompt`, loads ProseMirror on each page that shows the field or
// the composer. This test walks the static module graph of the two barrels
// (CONVENTIONS.md §9.4). The walk goes into each engine file that a barrel
// reaches, so an engine file that imports ProseMirror fails it.

const wysiwyg = join(srcDir, 'modules', 'wysiwyg')

const ENTRIES = [join(wysiwyg, 'index.ts'), join(srcDir, 'modules', 'chat', 'index.ts')]

/** Whether `file` loads only through an `import()`. */
function isLazy(file: string): boolean {
	return srcRelative(file) === 'modules/wysiwyg/wysiwyg-editor.ts'
}

/** Each runtime import of ProseMirror in the files that `entry` reaches before the lazy files. */
function proseMirrorImports(entry: string): string[] {
	return [...runtimeFiles([entry], isLazy)].flatMap((file) =>
		parseImports(readFileSync(file, 'utf8'))
			.filter(({ specifier, runtime }) => runtime && specifier.startsWith('prosemirror-'))
			.map(({ specifier }) => `${srcRelative(file)} → '${specifier}'`),
	)
}

describe('wysiwyg lazy boundary', () => {
	for (const entry of ENTRIES) {
		it(`${srcRelative(entry)} reaches no file of the editor`, () => {
			const paths = runtimePathsTo(entry, isLazy)

			expect(
				paths,
				`The editor of a Wysiwyg loads only through an \`import()\`:\n  ${paths.join('\n  ')}`,
			).toEqual([])
		})

		it(`${srcRelative(entry)} reaches no import of ProseMirror`, () => {
			const imports = proseMirrorImports(entry)

			expect(
				imports,
				`ProseMirror loads only with the editor of a Wysiwyg:\n  ${imports.join('\n  ')}`,
			).toEqual([])
		})
	}

	it('detects a static import of the editor', () => {
		// The control: the editor imports the schema and ProseMirror statically.
		const editor = join(wysiwyg, 'wysiwyg-editor.ts')

		const isSchema = (file: string) =>
			srcRelative(file) === 'modules/wysiwyg/engine/wysiwyg-schema.ts'

		expect(runtimePathsTo(editor, isSchema)).not.toEqual([])

		expect(proseMirrorImports(editor)).not.toEqual([])
	})
})
