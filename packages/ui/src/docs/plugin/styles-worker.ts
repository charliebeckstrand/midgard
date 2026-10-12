import { workerData } from 'node:worker_threads'
import { type CriticalCssJob, inlinePages } from './styles.ts'

// One worker of `inlineCriticalCss` (`styles.ts`). Node runs this file with
// the types removed, so the file and each file that it imports must use only
// the TypeScript syntax that Node can remove.

await inlinePages(workerData as CriticalCssJob)
