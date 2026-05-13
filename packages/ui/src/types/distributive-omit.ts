/**
 * `Omit` that distributes over unions — so `DistributiveOmit<A | B, K>` is
 * `Omit<A, K> | Omit<B, K>` rather than collapsing the union. Required when
 * the omit target is a discriminated union (e.g. `PolymorphicProps`) and the
 * discriminant must be preserved across the omit.
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
