import type { MapFeature } from 'ui/map'
import { words } from './words.ts'

/**
 * The name of each state and territory of `us-atlas`, by its FIPS code. The
 * atlas gives the code as the `id` of a feature, and its names are in English.
 */
const usStates: Readonly<Record<string, string>> = words('us-state', {
	'01': 'Alabama',
	'02': 'Alaska',
	'04': 'Arizona',
	'05': 'Arkansas',
	'06': 'California',
	'08': 'Colorado',
	'09': 'Connecticut',
	'10': 'Delaware',
	'11': 'District of Columbia',
	'12': 'Florida',
	'13': 'Georgia',
	'15': 'Hawaii',
	'16': 'Idaho',
	'17': 'Illinois',
	'18': 'Indiana',
	'19': 'Iowa',
	'20': 'Kansas',
	'21': 'Kentucky',
	'22': 'Louisiana',
	'23': 'Maine',
	'24': 'Maryland',
	'25': 'Massachusetts',
	'26': 'Michigan',
	'27': 'Minnesota',
	'28': 'Mississippi',
	'29': 'Missouri',
	'30': 'Montana',
	'31': 'Nebraska',
	'32': 'Nevada',
	'33': 'New Hampshire',
	'34': 'New Jersey',
	'35': 'New Mexico',
	'36': 'New York',
	'37': 'North Carolina',
	'38': 'North Dakota',
	'39': 'Ohio',
	'40': 'Oklahoma',
	'41': 'Oregon',
	'42': 'Pennsylvania',
	'44': 'Rhode Island',
	'45': 'South Carolina',
	'46': 'South Dakota',
	'47': 'Tennessee',
	'48': 'Texas',
	'49': 'Utah',
	'50': 'Vermont',
	'51': 'Virginia',
	'53': 'Washington',
	'54': 'West Virginia',
	'55': 'Wisconsin',
	'56': 'Wyoming',
	'60': 'American Samoa',
	'66': 'Guam',
	'69': 'Commonwealth of the Northern Mariana Islands',
	'72': 'Puerto Rico',
	'78': 'United States Virgin Islands',
})

/**
 * The name of a state in the language of the page. A map or a chart takes it as
 * its `regionLabel`, so the readout names the state in that language. The
 * name of the atlas is the fallback.
 */
export function stateLabel(state: MapFeature): string {
	return usStates[String(state.id)] ?? String(state.properties?.name)
}
