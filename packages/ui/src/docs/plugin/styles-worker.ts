import { workerData } from 'node:worker_threads'
import { register } from 'tsx/esm/api'
import type { CriticalCssJob } from './styles.ts'

// One worker of `inlineCriticalCss` (`styles.ts`). Node runs this file with
// the types removed, so the file must use only the TypeScript syntax that
// Node can remove.
//
// Each compile of Tailwind imports the `@plugin` files of `ui` again. Some of
// them import a module with no file extension, and the loader of Node does
// not resolve that import. Tailwind then loads each plugin with jiti, with no
// cache, and a compile took about 250 ms. The loader of tsx resolves the
// import, and a compile takes about 50 ms. The loader applies only to the
// imports after `register`, so `styles.ts` loads after it.
register()

const { inlinePages } = await import('./styles.ts')

await inlinePages(workerData as CriticalCssJob)
