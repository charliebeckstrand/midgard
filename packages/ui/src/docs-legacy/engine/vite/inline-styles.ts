import { globSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'

/** Options of {@link inlinePageStyles}. */
export type InlinePageStylesOptions = {
	/** The client directory of the build, which holds the HTML of each page. */
	clientDir: string
	/** The Tailwind entry stylesheet of the site. */
	stylesheet: string
}

/**
 * Put the styles of each prerendered page in a `<style>` in its HTML, and
 * load the full stylesheet without a block on the first paint.
 *
 * Tailwind compiles the entry stylesheet for the classes in the HTML of the
 * page only. The `dark:` and density variants of a class come with it, so each
 * appearance shows correctly before the full stylesheet loads. The rule order
 * is the same as in the full stylesheet, so the cascade does not change.
 *
 * Only Vite knows the hashed URL of a font file, so the `@font-face` rules
 * come from the full stylesheet.
 *
 * Each compile loads the Tailwind plugins again, so the pages go to one worker
 * thread for each CPU.
 */
export async function inlinePageStyles({
	clientDir,
	stylesheet,
}: InlinePageStylesOptions): Promise<void> {
	const pages = globSync('**/index.html', { cwd: clientDir })

	const count = Math.min(availableParallelism(), pages.length)

	await Promise.all(
		Array.from({ length: count }, (_, index) => {
			const files = pages.filter((_, page) => page % count === index)

			const worker = new Worker(new URL('./inline-styles-worker.ts', import.meta.url), {
				workerData: { clientDir, stylesheet, files },
			})

			return new Promise<void>((resolve, reject) => {
				worker.once('error', reject)

				worker.once('exit', (code) =>
					code === 0 ? resolve() : reject(new Error(`inline styles: worker exit code ${code}`)),
				)
			})
		}),
	)
}
