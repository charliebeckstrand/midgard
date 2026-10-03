import { useState } from 'react'
import { Button } from '../../../components/button'
import { Description, Field, Label } from '../../../components/fieldset'
import { Form } from '../../../components/form'
import { Rating, RatingSkeleton } from '../../../components/rating'
import { Text } from '../../../components/text'
import { Stack } from '../../../structure/stack'
import { Axes, Example, LabeledRow, LabeledRows } from '../../engine'

const sizes = ['sm', 'md', 'lg'] as const

const LEVELS = ['Unrated', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'] as const

/** Averages: what a display rating usually holds, and the reason it draws a fraction. */
const averages = [
	{ place: 'Clearwater Restaurant', score: 4.8 },
	{ place: "Mo's — Lincoln City", score: 4.2 },
	{ place: 'HWY 101 Burger', score: 3.5 },
	{ place: "Kyllo's Seafood & Grill", score: 2.1 },
]

function InteractiveExample() {
	const [score, setScore] = useState<number | null>(4)

	return (
		<Example title="Controlled">
			<Stack gap="sm">
				<Rating aria-label="Score" value={score} onValueChange={setScore} />

				<Text className="tabular-nums">{score === null ? 'Unrated' : `${score} of 5`}</Text>
			</Stack>
		</Example>
	)
}

function FormExample() {
	const [submitted, setSubmitted] = useState<number | null>(null)

	return (
		<Form
			defaultValues={{ score: 3 }}
			onSubmit={(values) => {
				setSubmitted(values.score)
			}}
		>
			<Stack gap="md">
				<Field>
					<Label>How was it?</Label>

					<Rating name="score" />

					<Description>Bound to the form field by name.</Description>
				</Field>

				<Stack gap="sm">
					<Button type="submit">Submit</Button>

					<Text className="tabular-nums">
						{submitted === null ? 'Not submitted' : `Submitted ${submitted}`}
					</Text>
				</Stack>
			</Stack>
		</Form>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="Rating"
				render={(props, label) => <Rating {...props} aria-label={label} defaultValue={3} />}
			/>

			<InteractiveExample />

			<Example title="Read-only averages">
				<LabeledRows>
					{averages.map(({ place, score }) => (
						<LabeledRow key={place} label={place}>
							<Rating readOnly value={score} />

							<Text className="tabular-nums">{score.toFixed(1)}</Text>
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

			<Example title="Count">
				<Stack gap="sm">
					<Rating aria-label="Out of three" count={3} defaultValue={2} />

					<Rating aria-label="Out of ten" count={10} defaultValue={7} />
				</Stack>
			</Example>

			<Example title="Named levels">
				<Rating
					aria-label="Level"
					defaultValue={4}
					getValueText={(value) => `${value} of 5 — ${LEVELS[value]}`}
				/>
			</Example>

			<Example title="In a form">
				<FormExample />
			</Example>

			<Example title="Skeleton">
				<Stack gap="sm">
					{sizes.map((size) => (
						<RatingSkeleton key={size} size={size} />
					))}
				</Stack>
			</Example>
		</>
	)
}
