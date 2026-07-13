// Public engine entry: the doc contracts plus the markdown convention parser.
// React-free and Node-free — safe to import from browser chrome, Vite plugins,
// and check scripts alike.

export type { BodySegment, DocMeta, DocModule, PreviewBlock, UsageAuthorConfig } from './contracts'
export type { LinkToken } from './link-syntax'
export { LINK_RE, parseLinkToken, stripLinks } from './link-syntax'
export type { DeriveOptions, FrontMatter, ModuleResolver, ParsedDoc, ParsedFence } from './parse'
export { createModuleResolver, deriveDocMeta, parseDoc } from './parse'
