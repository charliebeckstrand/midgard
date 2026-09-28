'use client'

import { type ReactNode, useState } from 'react'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from 'ui/card'
import { Code } from 'ui/code'
import { Confirm } from 'ui/confirm'
import { CopyButton } from 'ui/copy-button'
import { Divider } from 'ui/divider'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Input } from 'ui/input'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Factors, TotpSetup } from './account-api'
import {
	useConfirmTotp,
	useGenerateRecoveryCodes,
	useRemoveTotp,
	useStartTotpSetup,
} from './account-queries'
import { QrCode } from './qr-code'
import { Section } from './section'

type TwoStepProps = {
	factors: Factors
	/** Whether the user is an admin, who must keep a second factor. */
	admin: boolean
	/** The passkeys section, which shows under the status and before the app. */
	children: ReactNode
}

type CodeValues = { code: string }

/**
 * Card of the two-step sign-in of the signed-in user: its state, the passkeys,
 * the authenticator app, and the recovery codes.
 *
 * @remarks
 * The account page passes its passkeys section as `children`. An authenticator app
 * stays off until the user types a code from it, so a failed scan never turns
 * on a factor that the user cannot use. Recovery codes show only once, when the
 * gateway makes them, and stay on the page until the user leaves it.
 */
export function TwoStep({ factors, admin, children }: TwoStepProps) {
	const start = useStartTotpSetup()
	const confirm = useConfirmTotp()
	const removeApp = useRemoveTotp()
	const makeCodes = useGenerateRecoveryCodes()
	const [setup, setSetup] = useState<TotpSetup | null>(null)
	const [codes, setCodes] = useState<string[] | null>(null)
	const [removing, setRemoving] = useState(false)

	const error = start.error ?? confirm.error ?? removeApp.error ?? makeCodes.error

	const handleConfirm: FormSubmitHandler<CodeValues> = async ({ code }) => {
		await confirm.mutateAsync(code.replace(/\s/g, ''))

		setSetup(null)
	}

	return (
		<Card>
			<CardHeader>
				<Flex align="center" gap="sm">
					<CardTitle level={2}>Two-step sign-in</CardTitle>
					<Badge color={factors.enabled ? 'green' : 'amber'}>
						{factors.enabled ? 'On' : 'Off'}
					</Badge>
				</Flex>
				<CardDescription>
					{factors.enabled
						? 'After your password, you also use a passkey or your authenticator app.'
						: 'Add a passkey or an authenticator app to turn it on.'}
					{admin && ' Admin accounts must keep it on.'}
				</CardDescription>
			</CardHeader>

			<Stack gap="lg">
				{error && <Alert severity="error" title={error.message} />}

				{children}

				<Divider soft />

				{factors.totp ? (
					<Section
						title="Authenticator app"
						description="Your authenticator app is on."
						action={
							<Button
								variant="outline"
								color="red"
								disabled={removeApp.isPending}
								onClick={() => setRemoving(true)}
							>
								Remove
							</Button>
						}
					/>
				) : setup ? (
					<Section
						title="Authenticator app"
						description="Scan this code with your authenticator app, or type the key into it. Then type the code that the app shows."
					>
						<QrCode
							value={setup.uri}
							label="QR code for your authenticator app"
							className="size-48 self-center"
						/>
						<Flex align="center" gap="sm">
							<Code className="break-all">{setup.secret}</Code>
							<CopyButton text={setup.secret} aria-label="Copy the key" />
						</Flex>
						<Form<CodeValues>
							defaultValues={{ code: '' }}
							validate={{
								code: (value) =>
									/^\d{6}$/.test(value.replace(/\s/g, ''))
										? undefined
										: 'Type the six digits that the app shows',
							}}
							onSubmit={handleConfirm}
							className="grid gap-4"
						>
							<Field>
								<Label>Code from the app</Label>
								<Input name="code" inputMode="numeric" autoComplete="one-time-code" />
								<Message name="code" />
							</Field>
							<Flex gap="sm" wrap>
								<Button type="submit" color="blue" disabled={confirm.isPending}>
									Turn on
								</Button>
								<Button variant="plain" onClick={() => setSetup(null)}>
									Cancel
								</Button>
							</Flex>
						</Form>
					</Section>
				) : (
					<Section
						title="Authenticator app"
						description="Use the codes of an app such as 1Password or Google Authenticator."
						action={
							<Button
								variant="outline"
								disabled={start.isPending}
								onClick={() => start.mutate(undefined, { onSuccess: setSetup })}
							>
								Add
							</Button>
						}
					/>
				)}

				{factors.enabled && (
					<>
						<Divider soft />

						{codes ? (
							<Section
								title="Recovery codes"
								description="Keep these codes in a safe place. Each code works once, in place of your passkey or app. They do not show again."
								action={<CopyButton text={codes.join('\n')} aria-label="Copy the recovery codes" />}
							>
								<ul className="grid grid-cols-2 gap-2 font-mono">
									{codes.map((code) => (
										<li key={code}>{code}</li>
									))}
								</ul>
							</Section>
						) : (
							<Section
								title="Recovery codes"
								description={
									factors.recovery_codes === 0
										? 'You have no recovery codes. Make some, so that you can sign in if you lose your passkey or app.'
										: `You have ${factors.recovery_codes} unused recovery codes.`
								}
								action={
									<Button
										variant="outline"
										color={factors.recovery_codes === 0 ? 'blue' : undefined}
										disabled={makeCodes.isPending}
										onClick={() => makeCodes.mutate(undefined, { onSuccess: setCodes })}
									>
										{factors.recovery_codes === 0 ? 'Make codes' : 'Make new codes'}
									</Button>
								}
							/>
						)}
					</>
				)}
			</Stack>

			<Confirm
				open={removing}
				onOpenChange={setRemoving}
				onConfirm={() => {
					removeApp.mutate()

					setRemoving(false)
				}}
				title="Remove the authenticator app?"
				description="Its codes stop working when you remove it."
				confirm={{ label: 'Remove', color: 'red' }}
			/>
		</Card>
	)
}
