import type { AvatarProps } from 'ui/avatar'
import { createRandom } from './random.ts'
import { words } from './words.ts'

// The people of the demos (CONVENTIONS.md §13.8). Each named person has one
// profile, so a person is the same in each demo. A generated person after
// them is "Person" and a number.

/** The role of a person in the company. */
export const roles = words('role', {
	developer: 'Developer',
	designer: 'Designer',
	manager: 'Manager',
	analyst: 'Analyst',
})

export type Role = keyof typeof roles

/** Tells if `value` is the key of a role, such as a value that a form gives. */
export function isRole(value: unknown): value is Role {
	return typeof value === 'string' && Object.hasOwn(roles, value)
}

/** The department of a person. */
export const departments = words('department', {
	engineering: 'Engineering',
	product: 'Product',
	operations: 'Operations',
	finance: 'Finance',
})

export type Department = keyof typeof departments

/** The team of a person. */
export const teams = words('team', {
	platform: 'Platform',
	designSystems: 'Design systems',
	leadership: 'Leadership',
	analytics: 'Analytics',
})

export type Team = keyof typeof teams

/** The status of the account of a person. */
export const personStatuses = words('person-status', { active: 'Active', inactive: 'Inactive' })

export type PersonStatus = keyof typeof personStatuses

/** The word of a generated person, before its number. */
const generated = words('person', { name: 'Person' })

type AvatarColor = NonNullable<AvatarProps['color']>

/** The avatar colors of the generated people. */
const COLORS: readonly AvatarColor[] = ['zinc', 'red', 'amber', 'green', 'blue']

export type Person = {
	id: number
	name: string
	/** The initials of the name, for an avatar. */
	initials: string
	color: AvatarColor
	email: string
	role: Role
	department: Department
	team: Team
	/** A city. */
	location: string
	startDate: Date
	/** The salary in whole dollars a year. */
	salary: number
	/** The name of the manager of the person. */
	manager: string
	phone: string
	/** The level of the job, such as `L5`. */
	level: string
	status: PersonStatus
}

/** The named people, in the order of CONVENTIONS.md §13.8. */
export const profiles: readonly Person[] = [
	{
		id: 1,
		name: 'Wade Cooper',
		initials: 'WC',
		color: 'zinc',
		email: 'wade@example.com',
		role: 'developer',
		department: 'engineering',
		team: 'platform',
		location: 'San Francisco',
		startDate: new Date(2021, 2, 14),
		salary: 145_000,
		manager: 'Devon Webb',
		phone: '+1 (415) 555-0142',
		level: 'L5',
		status: 'active',
	},
	{
		id: 2,
		name: 'Arlene McCoy',
		initials: 'AM',
		color: 'green',
		email: 'arlene@example.com',
		role: 'designer',
		department: 'product',
		team: 'designSystems',
		location: 'New York',
		startDate: new Date(2022, 6, 1),
		salary: 132_000,
		manager: 'Devon Webb',
		phone: '+1 (212) 555-0188',
		level: 'L4',
		status: 'active',
	},
	{
		id: 3,
		name: 'Devon Webb',
		initials: 'DW',
		color: 'blue',
		email: 'devon@example.com',
		role: 'manager',
		department: 'operations',
		team: 'leadership',
		location: 'Austin',
		startDate: new Date(2019, 10, 23),
		salary: 158_000,
		manager: 'Tanya Fox',
		phone: '+1 (512) 555-0119',
		level: 'L6',
		status: 'inactive',
	},
	{
		id: 4,
		name: 'Tom Cook',
		initials: 'TC',
		color: 'green',
		email: 'tom@example.com',
		role: 'developer',
		department: 'engineering',
		team: 'platform',
		location: 'Seattle',
		startDate: new Date(2023, 1, 12),
		salary: 121_000,
		manager: 'Wade Cooper',
		phone: '+1 (206) 555-0167',
		level: 'L3',
		status: 'active',
	},
	{
		id: 5,
		name: 'Tanya Fox',
		initials: 'TF',
		color: 'red',
		email: 'tanya@example.com',
		role: 'designer',
		department: 'product',
		team: 'designSystems',
		location: 'Denver',
		startDate: new Date(2020, 4, 30),
		salary: 139_000,
		manager: 'Arlene McCoy',
		phone: '+1 (303) 555-0173',
		level: 'L5',
		status: 'inactive',
	},
	{
		id: 6,
		name: 'Hellen Schmidt',
		initials: 'HS',
		color: 'amber',
		email: 'hellen@example.com',
		role: 'manager',
		department: 'engineering',
		team: 'leadership',
		location: 'Chicago',
		startDate: new Date(2018, 8, 4),
		salary: 162_000,
		manager: 'Devon Webb',
		phone: '+1 (312) 555-0154',
		level: 'L6',
		status: 'active',
	},
	{
		id: 7,
		name: 'Ravi Shah',
		initials: 'RS',
		color: 'red',
		email: 'ravi@example.com',
		role: 'analyst',
		department: 'finance',
		team: 'analytics',
		location: 'Boston',
		startDate: new Date(2022, 0, 10),
		salary: 118_000,
		manager: 'Hellen Schmidt',
		phone: '+1 (617) 555-0131',
		level: 'L4',
		status: 'active',
	},
	{
		id: 8,
		name: 'Mia Chen',
		initials: 'MC',
		color: 'amber',
		email: 'mia@example.com',
		role: 'developer',
		department: 'engineering',
		team: 'platform',
		location: 'Portland',
		startDate: new Date(2024, 3, 22),
		salary: 112_000,
		manager: 'Hellen Schmidt',
		phone: '+1 (503) 555-0196',
		level: 'L3',
		status: 'active',
	},
]

/** The cities of the generated people. */
const CITIES = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Denver', 'Chicago', 'Boston']

/** The levels of the generated people. */
const LEVELS = ['L2', 'L3', 'L4', 'L5', 'L6']

/**
 * The person with the id `id`: a named person for an id up to 8, else a
 * generated person, "Person 9" and up. The id seeds the values of a generated
 * person, so each demo gives the same person for the same id.
 */
export function person(id: number): Person {
	const profile = profiles[id - 1]

	if (profile) return profile

	const random = createRandom(id)

	return {
		id,
		name: `${generated.name} ${id}`,
		initials: `P${id}`,
		color: random.pick(COLORS),
		email: `person${id}@example.com`,
		role: random.pick(Object.keys(roles) as Role[]),
		department: random.pick(Object.keys(departments) as Department[]),
		team: random.pick(Object.keys(teams) as Team[]),
		location: random.pick(CITIES),
		startDate: new Date(random.int(2018, 2025), random.int(0, 11), random.int(1, 28)),
		salary: random.int(90, 170) * 1000,
		manager: random.pick(profiles).name,
		phone: `+1 (555) 555-${String(random.int(0, 9999)).padStart(4, '0')}`,
		level: random.pick(LEVELS),
		status: random.int(0, 3) === 0 ? 'inactive' : 'active',
	}
}

/** The first `count` people: the named people, then generated people. */
export function people(count: number): Person[] {
	return Array.from({ length: count }, (_, index) => person(index + 1))
}
