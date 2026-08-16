export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'scope-enum': [
			2,
			'always',
			['admin', 'auth', 'docs', 'places', 'recipes', 'shared', 'ui', 'midgard'],
		],
	},
};
