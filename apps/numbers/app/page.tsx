import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createSeed } from '@/utilities/seed'

/** The page only sends the reader on, with a seed of the request, so it has no shell to prerender. */
export const instant = false

/** Starts a new run: the page sends the reader to the address of a new seed. */
export default async function Page() {
	// The seed belongs to the request, not to a prerender.
	await connection()

	redirect(`/${createSeed()}`)
}
