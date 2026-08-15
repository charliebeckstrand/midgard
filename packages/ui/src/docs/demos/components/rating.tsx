import { useState } from 'react'
import { Button } from '../../../components/button'
import { Description, Field, Label } from '../../../components/fieldset'
import { Form } from '../../../components/form'
import { Rating, RatingSkeleton } from '../../../components/rating'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { capitalize, Example, LabeledRow, LabeledRows } from '../../engine'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

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
		<Example title="Default">
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
					<Button type="submit" className="w-fit">
						Submit
					</Button>

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
			<InteractiveExample />

			<Example title="Sizes">
				<LabeledRows>
					{sizes.map((size, index) => (
						<LabeledRow key={size} label={size}>
							<Rating aria-label={size} size={size} defaultValue={index + 3} />
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

			<Example title="Colors">
				<LabeledRows>
					{colors.map((color, index) => (
						<LabeledRow key={color} label={capitalize(color)}>
							<Rating aria-label={capitalize(color)} color={color} defaultValue={index + 1} />
						</LabeledRow>
					))}
				</LabeledRows>
			</Example>

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

			<Example title="Disabled">
				<Rating aria-label="Disabled" disabled defaultValue={3} />
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
