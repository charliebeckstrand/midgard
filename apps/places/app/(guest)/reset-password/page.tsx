import { ResetPasswordPage } from 'shared/auth'

/** Page that the password reset link opens. The link gives the token in `?token=`. */
export default async function ResetPassword({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const { token = '' } = await searchParams

	return <ResetPasswordPage token={token} />
}
