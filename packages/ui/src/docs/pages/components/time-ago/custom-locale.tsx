import { Code } from 'ui/code'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { MIN, useNow } from './now.ts'

const locales = ['fr-FR', 'it-IT', 'en-US']

export default function CustomLocale() {
	const now = useNow()

	if (now === null) return null

	return (
		<Stack gap="xs">
			{locales.map((locale) => (
				<Flex key={locale} gap="sm" align="center">
					<Code>{locale}</Code>
					<TimeAgo date={now - 5 * MIN} locale={locale} />
				</Flex>
			))}
		</Stack>
	)
}
