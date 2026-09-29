// The entry of the extractor worker. A worker thread starts without the tsx
// loader of the dev server, so this file registers tsx and then imports the
// TypeScript body of the worker.
import { register } from 'tsx/esm/api'

register()

await import('./extractor-thread.ts')
