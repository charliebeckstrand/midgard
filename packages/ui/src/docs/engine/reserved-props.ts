/**
 * React-reserved and structural props the docs surface never treats as
 * configurable: `key` and `ref` are React-reserved, `children` is structural,
 * and `className` is styling noise. Shared by the derived-code walker and the
 * api-reference extractor, so the two stay aligned. The walker omits them from
 * emitted JSX; the extractor omits them from prop tables.
 */
export const IGNORED_PROPS: ReadonlySet<string> = new Set(['children', 'className', 'key', 'ref'])
