/**
 * The bridge from the read of a server page to a client query. The server page
 * wraps its read in `seed`, and the query spreads `seededQuery` of it.
 */
export { type Seed, seed, seededQuery } from './seed'
