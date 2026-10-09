'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useState } from 'react'
import { latestError } from 'shared/providers'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from 'ui/card'
import { Code } from 'ui/code'
import { useConfirm } from 'ui/confirm'
import { CopyButton } from 'ui/copy-button'
import { Divider } from 'ui/divider'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Input } from 'ui/input'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Factors, TotpSetup } from './account-api'
import {
	useConfirmTotp,
	useGenerateRecoveryCodes,
	useRemoveTotp,
	useStartTotpSetup,
} from './account-queries'
import { Section } from './section'

/**
 * The code of the QR code and its encoder. Only a user who sets up an
 * authenticator app sees a QR code, so the page does not wait for it.
 */
const loadQrCode = () => import('./qr-code')

/**
 * The QR code. Its `loading` placeholder gives the code a Suspense boundary of
 * its own and keeps the space of the code, so the section does not move when
 * the code shows.
 */
const QrCode = dynamic(() => loadQrCode().then((module) => module.QrCode), {
	loading: () => <div className="size-48 self-center" />,
})

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
	const confirmTotp = useConfirmTotp()
	const removeApp = useRemoveTotp()
	const makeCodes = useGenerateRecoveryCodes()
	const [setup, setSetup] = useState<TotpSetup | null>(null)
	const [codes, setCodes] = useState<string[] | null>(null)
	const confirm = useConfirm()

	const error = latestError(start, confirmTotp, removeApp, makeCodes)

	const handleConfirm: FormSubmitHandler<CodeValues> = async ({ code }) => {
		await confirmTotp.mutateAsync(code.replace(/\s/g, ''))

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
								onClick={async () => {
									const confirmed = await confirm({
										title: 'Remove the authenticator app?',
										description: 'Its codes stop working when you remove it.',
										confirm: { label: 'Remove', color: 'red' },
									})

									if (confirmed) removeApp.mutate()
								}}
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
						>
							<Stack gap="lg">
								<Field>
									<Label>Code from the app</Label>
									<Input name="code" inputMode="numeric" autoComplete="one-time-code" />
									<Message name="code" />
								</Field>
								<Flex gap="sm" wrap>
									<Button type="submit" color="blue" disabled={confirmTotp.isPending}>
										Turn on
									</Button>
									<Button variant="plain" onClick={() => setSetup(null)}>
										Cancel
									</Button>
								</Flex>
							</Stack>
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
								onClick={() => {
									// Fetch the code of the QR code while the gateway makes the secret.
									void loadQrCode()

									start.mutate(undefined, { onSuccess: setSetup })
								}}
							>
								Add
							</Button>
						}
					/>
				)}

				{factors.enabled && (
					<>
						<Divider soft />

						<RecoveryCodes
							codes={codes}
							count={factors.recovery_codes}
							pending={makeCodes.isPending}
							onMake={() => makeCodes.mutate(undefined, { onSuccess: setCodes })}
						/>
					</>
				)}
			</Stack>
		</Card>
	)
}

type RecoveryCodesProps = {
	/** The codes that the gateway just made, or `null` before the user makes them. */
	codes: string[] | null
	/** The number of unused recovery codes that the user has. */
	count: number
	/** Whether a request to make new codes is in progress. */
	pending: boolean
	/** Makes a new set of codes. */
	onMake: () => void
}

/**
 * The recovery codes section of {@link TwoStep}: the new codes once the gateway
 * makes them, or else the count of unused codes and the button that makes them.
 *
 * @internal
 */
function RecoveryCodes({ codes, count, pending, onMake }: RecoveryCodesProps) {
	if (codes) {
		return (
			<Section
				title="Recovery codes"
				description="Keep these codes in a safe place. Each code works once, in place of your passkey or app. They do not show again."
				action={<CopyButton text={codes.join('\n')} aria-label="Copy the recovery codes" />}
			>
				{/* The list is `contents`, so each code is a cell of the grid. */}
				<Columns columns={2} gap="sm" className="font-mono">
					<ul className="contents">
						{codes.map((code) => (
							<li key={code}>{code}</li>
						))}
					</ul>
				</Columns>
			</Section>
		)
	}

	return (
		<Section
			title="Recovery codes"
			description={
				count === 0
					? 'You have no recovery codes. Make some, so that you can sign in if you lose your passkey or app.'
					: `You have ${count} unused recovery codes.`
			}
			action={
				<Button
					variant="outline"
					color={count === 0 ? 'blue' : undefined}
					disabled={pending}
					onClick={onMake}
				>
					{count === 0 ? 'Make codes' : 'Make new codes'}
				</Button>
			}
		/>
	)
}
