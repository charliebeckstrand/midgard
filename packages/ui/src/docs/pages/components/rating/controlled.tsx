import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { Rating } from 'ui/rating'
import { Text } from 'ui/text'

export default function Controlled() {
	const [score, setScore] = useState<number | null>(4)

	return (
		<>
			<Field>
				<Label as="span">Rate this recipe</Label>
				<Rating value={score} onValueChange={setScore} />
			</Field>
			<Text>Value: {score ?? 'Empty'}</Text>
		</>
	)
}
