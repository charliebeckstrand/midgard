/**
 * Data that a server page read, with the time of the read. The page gives it
 * to a client query through {@link seededQuery}.
 */
export type Seed<Data> = {
	data: Data
	/** The time of the read, in milliseconds since the epoch. */
	readAt: number
}

/**
 * Marks `data` with the time of the read. Call it on the server, after the read
 * that gives `data`.
 *
 * @example
 * ```tsx
 * const users = await requireGateway('/api/users', () => bifrost.GET('/api/users'))
 *
 * return <UsersClient users={seed(users?.data ?? [])} />
 * ```
 */
export function seed<Data>(data: Data): Seed<Data> {
	return { data, readAt: Date.now() }
}

/**
 * The options that put the read of a server page into a query: the data, the
 * time of the read, and a `gcTime` of `0`. Spread them into `useQuery`.
 *
 * @remarks
 * The entry stays only while a reader of it is mounted. When the page closes,
 * the cache drops the entry, so a revisit starts from the newer read of the
 * server and does not fetch again. A plain `initialData` fills only an empty
 * entry: a revisit shows the old copy and then fetches a second time.
 *
 * The time of the read makes an old seed stale. A back navigation can show a
 * page that the router kept, and the query then fetches when the seed is older
 * than the `staleTime` of the app.
 *
 * Use it only for a key that one page reads. A second page that reads the same
 * key keeps its own copy.
 *
 * @example
 * ```ts
 * useQuery({ queryKey: usersKeys.all, queryFn: fetchUsers, ...seededQuery(users) })
 * ```
 */
export function seededQuery<Data>(seed: Seed<Data>) {
	return { initialData: seed.data, initialDataUpdatedAt: seed.readAt, gcTime: 0 } as const
}
