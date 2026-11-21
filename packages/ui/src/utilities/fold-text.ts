/**
 * The text in the form that a search compares: with no accents, and in lower
 * case. With it, the query "cafe" finds "Café", and "sao" finds "São".
 *
 * @remarks The fold splits each accented letter into its base letter and its
 * marks (NFD), removes each mark, and then lowers the case. The lower case does
 * not read the locale, so each machine folds a text the same way. Fold the query
 * and the text with this one function, so that the two match in the same form.
 * A caller that also joins the runs of white space or of punctuation does that
 * after the fold.
 * @param text - The text to fold.
 * @returns The folded text.
 * @example
 *   foldText('Pão de Açúcar') // 'pao de acucar'
 */
export function foldText(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
