import { fileURLToPath } from 'node:url'
import { serveNext } from './serve-next'

// The entry of `dist/serve-next.js`. The image puts the file in the folder of
// the app in the standalone output, beside `server.js`.
await serveNext(fileURLToPath(new URL('.', import.meta.url)))
