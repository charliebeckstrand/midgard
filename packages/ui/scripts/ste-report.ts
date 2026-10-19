/**
 * Lists the comments of the `ui` source tree that break STE rule 6, the
 * sentence cap: 20 words for an instruction, 25 for a description.
 *
 * `controlled-language-boundary.test.ts` gates rules 3 and 10 in the comments.
 * Rule 6 has too much debt for a gate, so review decides what to fix, and this
 * report gives review the list. The rule documents and the surface docs carry
 * no rule 6 debt, and the boundary suite gates them.
 */

import { scanPackage } from '../src/__tests__/helpers/controlled-language.ts'
import { startTypeScript } from '../src/__tests__/helpers/ts-server.ts'

const server = startTypeScript()

const breaks = scanPackage(server).filter((item) => item.rule === 6)

server.close()

for (const item of breaks) console.log(`${item.file}:${item.line} — ${item.text}`)

console.log(`\n${breaks.length} sentences past the cap (STE.md rule 6).`)
