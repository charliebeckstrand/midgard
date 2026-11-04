import { workerData } from 'piscina'
import { type CriticalCssData, inlinePage } from './styles.ts'

// A thread of the pool of `inlineCriticalCss` (`styles.ts`). Node runs this
// file with the types removed, so the file and each file that it imports
// must use only the TypeScript syntax that Node can remove.

/** Writes the critical CSS of `pages`, the copies of one page in each locale. */
export function run(pages: readonly string[]): Promise<void> {
	return inlinePage(workerData as CriticalCssData, pages)
}
