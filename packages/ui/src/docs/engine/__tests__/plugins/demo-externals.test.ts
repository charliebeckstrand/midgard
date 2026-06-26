import { describe, expect, it } from 'vitest'
import { parseExternalImports } from '../../plugins/docs'

function parse(source: string) {
	return parseExternalImports(source, 'demo.tsx')
}

describe('parseExternalImports', () => {
	it('collects PascalCase named imports from a bare specifier', () => {
		const result = parse(`import { Heart, Plus, Star } from 'lucide-react'`)

		expect(result).toEqual([
			{ name: 'Heart', specifier: 'lucide-react' },
			{ name: 'Plus', specifier: 'lucide-react' },
			{ name: 'Star', specifier: 'lucide-react' },
		])
	})

	it('skips relative imports (resolved through the tagged ui barrels)', () => {
		expect(parse(`import { Icon } from '../../components/icon'`)).toEqual([])
	})

	it('skips react and react-dom, including subpaths', () => {
		const source = [
			`import { Fragment } from 'react'`,
			`import { Root } from 'react-dom/client'`,
		].join('\n')

		expect(parse(source)).toEqual([])
	})

	it('skips type-only imports and type specifiers', () => {
		const source = [
			`import type { LucideIcon } from 'lucide-react'`,
			`import { type LucideProps, Star } from 'lucide-react'`,
		].join('\n')

		expect(parse(source)).toEqual([{ name: 'Star', specifier: 'lucide-react' }])
	})

	it('records the source name for aliased specifiers', () => {
		// The source name matches the component's `displayName` and the import a
		// reader would write.
		expect(parse(`import { Star as Favorite } from 'lucide-react'`)).toEqual([
			{ name: 'Star', specifier: 'lucide-react' },
		])
	})

	it('skips default and namespace imports', () => {
		const source = [`import Whole from 'some-lib'`, `import * as Icons from 'lucide-react'`].join(
			'\n',
		)

		expect(parse(source)).toEqual([])
	})

	it('skips non-PascalCase named imports (hooks, helpers)', () => {
		expect(parse(`import { useThing, Widget } from 'some-lib'`)).toEqual([
			{ name: 'Widget', specifier: 'some-lib' },
		])
	})
})
