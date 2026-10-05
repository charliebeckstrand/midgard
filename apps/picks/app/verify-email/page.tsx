import { VerifyEmailPage } from 'shared/auth'

/**
 * Page that the verification link opens. The link gives the token in `?token=`.
 *
 * @remarks The page is not in the guest layout, so it also opens with a session.
 */
export default function VerifyEmail() {
	return <VerifyEmailPage />
}
