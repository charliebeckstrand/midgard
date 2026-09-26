import { requireSecondStep } from 'auth'
import { SecondStepPage } from 'shared/auth'

/**
 * Second sign-in step. `requireSecondStep` checks the ticket of the password
 * step on the gateway, and sends a visit without one to `/login`.
 */
export default async function VerifyPage() {
	const methods = await requireSecondStep()

	return <SecondStepPage methods={methods} />
}
