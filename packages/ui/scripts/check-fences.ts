import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Type-check every `tsx preview` fence. esbuild strips types without checking
// them, so without this pass authored fence code would never see a compiler.
// Each fence lands in a temp project as its own module (a header comment maps
// it back to the source md), and one `tsc --noEmit` run covers them all.

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The parser ships in the docs package's build output; bootstrap the build
// once when a fresh checkout hasn't produced it yet.
const require = createRequire(import.meta.url)

const docsPackageDir = path.dirname(require.resolve('docs/package.json'))

if (!fs.existsSync(path.join(docsPackageDir, 'dist', 'engine.js'))) {
	execFileSync('pnpm', ['--filter', 'docs', 'build'], { cwd: appRoot, stdio: 'inherit' })
}

const { parseDoc } = await import('docs/engine')

const contentRoot = path.join(appRoot, 'content')

const outDir = path.join(appRoot, 'node_modules', '.docs-fences')

fs.rmSync(outDir, { recursive: true, force: true })

fs.mkdirSync(outDir, { recursive: true })

const mdFiles = fs.existsSync(contentRoot)
	? fs
			.readdirSync(contentRoot, { withFileTypes: true, recursive: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
			.map((entry) => path.join(entry.parentPath, entry.name))
			.sort()
	: []

let count = 0

for (const file of mdFiles) {
	const relative = path.relative(appRoot, file)

	const parsed = parseDoc(fs.readFileSync(file, 'utf8'), relative)

	parsed.previews.forEach((fence, index) => {
		const stem = path.relative(contentRoot, file).replace(/\.md$/, '').replaceAll(path.sep, '__')

		const header = `// source: ${relative}:${fence.line} (preview fence #${index})\n`

		fs.writeFileSync(path.join(outDir, `${stem}__${index}.tsx`), header + fence.code)

		count += 1
	})
}

fs.writeFileSync(
	path.join(outDir, 'tsconfig.json'),
	`${JSON.stringify({ extends: '../../tsconfig.json', include: ['./**/*.tsx'] }, null, '\t')}\n`,
)

if (count === 0) {
	console.log('check-fences: no preview fences found')

	process.exit(0)
}

try {
	execFileSync(path.join(appRoot, 'node_modules', '.bin', 'tsc'), ['-p', outDir, '--noEmit'], {
		stdio: 'inherit',
	})
} catch {
	console.error(`check-fences: type errors in preview fences (see the // source: headers above)`)

	process.exit(1)
}

console.log(`check-fences: ${count} preview fence${count === 1 ? '' : 's'} type-checked`)
