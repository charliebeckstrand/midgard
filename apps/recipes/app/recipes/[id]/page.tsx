import { RecipePage } from '@/components/recipe-page'

/** The route's own parameters, which Next hands over as a promise. */
type Props = { params: Promise<{ id: string }> }

/**
 * One recipe. The server reads the id out of the address and hands it down; the
 * record itself is read from the cached list on the client, which is what lets
 * an edit reach this page and a delete leave it (CONVENTIONS §2.3).
 */
export default async function Page({ params }: Props) {
	const { id } = await params

	return <RecipePage id={id} />
}
