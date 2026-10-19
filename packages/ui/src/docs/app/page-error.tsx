import { Button } from 'ui/button'
import { Heading, type HeadingLevel } from 'ui/heading'
import { defineMessages, IntlMessage } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const messages = defineMessages({
	heading: {
		id: 'docs.pageError.heading',
		defaultMessage: 'Could not load this page',
		description: 'The heading that shows in place of a page of the docs that fails to render.',
	},
	body: {
		id: 'docs.pageError.body',
		defaultMessage: 'Reload the page to try again.',
		description: 'The text under the heading of a page of the docs that fails to render.',
	},
	reload: {
		id: 'docs.pageError.reload',
		defaultMessage: 'Reload',
		description: 'The label of the button that loads the page again after an error.',
	},
})

/**
 * Shows in place of a part of the docs that fails to render, with a button
 * that reloads the page. In the shell, the header holds the `h1` of the page,
 * so the error takes `level` 2. In place of the shell, it takes `level` 1.
 * There it is outside the locale provider of the shell, so its text is English.
 */
export function PageError({ level }: { level: HeadingLevel }) {
	return (
		<Stack gap="md" className="p-6">
			<Heading level={level}>
				<IntlMessage message={messages.heading} />
			</Heading>
			<Text tone="muted">
				<IntlMessage message={messages.body} />
			</Text>
			<div>
				<Button variant="outline" onClick={() => location.reload()}>
					<IntlMessage message={messages.reload} />
				</Button>
			</div>
		</Stack>
	)
}
