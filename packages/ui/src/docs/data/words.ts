/**
 * The words of one domain of the demo data, such as the statuses of an order,
 * by key. The data holds the key, and a demo shows the word:
 *
 * ```ts
 * const orderStatuses = words('order-status', { pending: 'Pending', shipped: 'Shipped' })
 *
 * orderStatuses[order.status]
 * ```
 *
 * The function gives `words` as it is. `pnpm intl` reads each call and writes
 * a catalog entry for each word, with the id `docs.data.<domain>.<key>`, and
 * the copy of the module in each language holds the translated words
 * (`plugin/demo-text.ts`). The id holds the domain, so the same English word
 * can have another translation in another domain, such as the gender of
 * "Active". The domain and the words are literals, because the extraction
 * reads the source.
 *
 * @param domain - The domain of the words, such as `order-status`.
 * @param words - The English word of each key.
 */
export function words<const Key extends string>(
	_domain: string,
	words: Readonly<Record<Key, string>>,
): Readonly<Record<Key, string>> {
	return words
}
