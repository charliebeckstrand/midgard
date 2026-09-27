import { VerifyEmailPage } from 'shared/auth'

/**
 * Page that the verification link opens. The link gives the token in `?token=`.
 *
 * @remarks
 * The page is not in the guest layout, so it also opens with a session. The root
 * layout stops the page scroll for the map, so this page scrolls on its own.
 */
export default async function VerifyEmail({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const { token = '' } = await searchParams

	return (
		<div className="h-full overflow-y-auto">
			<VerifyEmailPage token={token} />
		</div>
	)
}
