import { highlightShiki, type ShikiRequest } from '../../components/code/code-shiki-highlighter.ts'
import { serveThread } from './thread.ts'

// The thread of the highlighter of the docs plugin (`index.ts`). Shiki
// highlights each example in this thread, so the main thread of Vite
// transforms the other modules in that time.

serveThread(({ code = '', lang, theme }: Omit<ShikiRequest, 'id'>) =>
	highlightShiki(code, lang, theme),
)
