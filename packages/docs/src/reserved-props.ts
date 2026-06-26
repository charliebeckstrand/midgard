/**
 * React-reserved and structural props the docs surface never treats as
 * configurable: `key` and `ref` are React-reserved, `children` is structural,
 * and `className` is styling noise. Shared by the derived-code walker (which
 * omits them from emitted JSX) and the api-reference extractor (which omits
 * them from prop tables) so the two stay aligned.
 */
export const IGNORED_PROPS: ReadonlySet<string> = new Set(['children', 'className', 'key', 'ref'])
