import { register } from 'tsx/esm/api'
import type { ShikiRequest } from '../../components/code/code-shiki-highlighter.ts'
import { serveThread } from './thread.ts'

// The thread of the highlighter of the docs plugin (`index.ts`). Shiki
// highlights each example in this thread, so the main thread of Vite
// transforms the other modules in that time.
//
// `code-shiki-highlighter.ts` imports a module with no file extension, and
// the loader of Node does not resolve that import. The loader of tsx
// resolves it. It applies only to the imports after `register`, so the
// highlighter loads after it.
register()

const { highlightShiki } = await import('../../components/code/code-shiki-highlighter.ts')

serveThread(({ code = '', lang, theme }: Omit<ShikiRequest, 'id'>) =>
	highlightShiki(code, lang, theme),
)
