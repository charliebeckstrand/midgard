/**
 * The language and the direction of the TSDoc of ui, which stays English in
 * each language of the docs (CONVENTIONS.md §13.10). The `lang` of the text
 * tells a screen reader to read it with an English voice. The `dir` keeps the
 * text left to right on a right-to-left page, so the period of a sentence
 * stays at its end.
 */
export const TSDOC = { lang: 'en', dir: 'ltr' } as const
