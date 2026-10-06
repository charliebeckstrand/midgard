import { globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { normalizePath } from 'vite'
import { LOCALE } from './api.ts'

/** A page of the docs, as the sidebar and the header show it. */
export type PageLink = {
	/** The path of the page, such as `/button` or `/modules/grid`. */
	path: string
	/** The name of the page, such as `Button` or `Grid`. */
	name: string
	/** The folder of the page in `pages/`, which is its section of the sidebar, such as `components`. */
	category: string
	/** The folder name of each tab of the page that has a path of its own, such as `sorting`, in name order. */
	tabs: string[]
}

/** A page of the docs, as the routes read it. */
type Page = PageLink & {
	/** The folder of the page, relative to `pages/`, such as `modules/grid`. */
	folder: string
}

// The folder of the components. Its pages have no folder in their path.
const COMPONENTS = 'components'

// The default export of a page, such as `export default function ButtonPage`.
const PAGE = /^export default function (\w+)Page\(/m

/**
 * The name of the page in `file`: the name of its default export, less
 * `Page`. The name of a folder has no case, so `UIPage` gives `UI` where the
 * folder `ui` gives only `Ui`.
 */
function nameOf(file: string): string {
	const name = PAGE.exec(readFileSync(file, 'utf8'))?.[1]

	if (!name) throw new Error(`docs: ${file} has no default export \`<Name>Page\``)

	return name
}

/**
 * Finds the pages in `pages/` of the docs at `docs`. A page is the
 * `index.tsx` of a folder in a section folder, such as
 * `pages/components/button/index.tsx`. A component page is at `/<name>`, and
 * another page is at `/<section>/<name>`. The `index.tsx` of a folder in a
 * page folder is a tab of the page, one more part down the path.
 */
export function findPages(docs: string): Page[] {
	const pages = path.join(docs, 'pages')

	return globSync('*/*/index.tsx', { cwd: pages })
		.map((file) => {
			const folder = normalizePath(path.dirname(file))

			const [category = '', name = ''] = folder.split('/')

			const tabs = globSync('*/index.tsx', { cwd: path.join(pages, folder) })

			return {
				path: category === COMPONENTS ? `/${name}` : `/${folder}`,
				name: nameOf(path.join(pages, file)),
				category,
				folder,
				tabs: tabs.map((tab) => path.dirname(tab)).toSorted(),
			}
		})
		.toSorted(
			// The components first, and then each other section in name order.
			(a, b) =>
				Number(a.category !== COMPONENTS) - Number(b.category !== COMPONENTS) ||
				a.category.localeCompare(b.category, LOCALE) ||
				a.name.localeCompare(b.name, LOCALE),
		)
}
