import { Button } from 'ui/button'
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from 'ui/card'
import { Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Stack } from 'ui/stack'

// The layout centers the card on both axes, and stacks a second card or a
// link under it with a gap. In an app it is as tall as the viewport
// (`min-h-dvh`). The area of the example is a size container, so the example
// gives the layout the height of the area in its place.
export default function SignIn() {
	return (
		<AuthLayout className="min-h-[100cqh]">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
				</CardHeader>
				<CardBody>
					<Stack gap="md">
						<Field>
							<Label>Email</Label>
							<Input type="email" autoComplete="email" />
						</Field>
						<Field>
							<Label>Password</Label>
							<Input type="password" autoComplete="current-password" />
						</Field>
					</Stack>
				</CardBody>
				<CardFooter>
					<Button className="w-full">Sign in</Button>
				</CardFooter>
			</Card>
		</AuthLayout>
	)
}
