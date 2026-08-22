export type ChartShortcutGroup =
	| "applyInclude"
	| "applyExclude"
	| "subToggleInclude"
	| "subToggleExclude"
	| "allToggleInclude"
	| "allToggleExclude"
	| "advancedUser"
	| "advancedExclude"
	| "updateChart";

export type ChartShortcutActionId =
	| "includeGenre"
	| "includeInfluence"
	| "includeEither"
	| "includeDescriptor"
	| "excludeGenre"
	| "excludeInfluence"
	| "excludeEither"
	| "excludeDescriptor"
	| "toggleSubGenreInclude"
	| "toggleSubInfluenceInclude"
	| "toggleSubEitherInclude"
	| "toggleSubDescriptorInclude"
	| "toggleSubGenreExclude"
	| "toggleSubInfluenceExclude"
	| "toggleSubEitherExclude"
	| "toggleSubDescriptorExclude"
	| "toggleAllGenreInclude"
	| "toggleAllInfluenceInclude"
	| "toggleAllEitherInclude"
	| "toggleAllDescriptorInclude"
	| "toggleAllGenreExclude"
	| "toggleAllInfluenceExclude"
	| "toggleAllEitherExclude"
	| "toggleAllDescriptorExclude"
	| "onlyRatingsSelf"
	| "onlyRatingsFollowing"
	| "onlyRatingsFollowers"
	| "excludeRated"
	| "excludeCataloged"
	| "excludeWishlisted"
	| "updateChart";

export type ChartShortcutAction = {
	readonly id: ChartShortcutActionId;
	readonly group: ChartShortcutGroup;
	readonly label: string;
	readonly hint: string;
	readonly defaultBindings: readonly string[];
};

export const CHART_SHORTCUT_GROUP_LABELS: Record<ChartShortcutGroup, string> = {
	applyInclude: "Include first result as",
	applyExclude: "Exclude first result as",
	subToggleInclude: "Include sub-genres/descriptors",
	subToggleExclude: "Exclude sub-genres/descriptors",
	allToggleInclude: "Must contain all",
	allToggleExclude: "Only exclude items containing all",
	advancedUser: "Only include ratings from",
	advancedExclude: "Exclude releases",
	updateChart: "Update chart",
};

export const CHART_SHORTCUT_ACTIONS: readonly ChartShortcutAction[] = [
	{
		id: "includeGenre",
		group: "applyInclude",
		label: "Include genre",
		hint: 'include first genre result as "genre"',
		defaultBindings: ["ctrl+Digit1"],
	},
	{
		id: "includeInfluence",
		group: "applyInclude",
		label: "Include genre as influence",
		hint: 'include first genre result as "influence"',
		defaultBindings: ["ctrl+Digit2"],
	},
	{
		id: "includeEither",
		group: "applyInclude",
		label: "Include genre as either",
		hint: 'include first genre result as "either"',
		defaultBindings: ["ctrl+Digit3"],
	},
	{
		id: "includeDescriptor",
		group: "applyInclude",
		label: "Include descriptor",
		hint: 'include first descriptor result as "descriptor"',
		defaultBindings: ["ctrl+KeyD"],
	},
	{
		id: "excludeGenre",
		group: "applyExclude",
		label: "Exclude genre",
		hint: 'exclude first genre result as "genre"',
		defaultBindings: ["ctrl+shift+Digit1"],
	},
	{
		id: "excludeInfluence",
		group: "applyExclude",
		label: "Exclude genre as influence",
		hint: 'exclude first genre result as "influence"',
		defaultBindings: ["ctrl+shift+Digit2"],
	},
	{
		id: "excludeEither",
		group: "applyExclude",
		label: "Exclude genre as either",
		hint: 'exclude first genre result as "either"',
		defaultBindings: ["ctrl+shift+Digit3"],
	},
	{
		id: "excludeDescriptor",
		group: "applyExclude",
		label: "Exclude descriptor",
		hint: 'exclude first descriptor result as "descriptor"',
		defaultBindings: ["ctrl+shift+KeyD"],
	},
	{
		id: "toggleSubGenreInclude",
		group: "subToggleInclude",
		label: "Include sub-genres: genres",
		hint: 'toggle "Include sub-genres" for "genres"',
		defaultBindings: ["ctrl+KeyZ"],
	},
	{
		id: "toggleSubInfluenceInclude",
		group: "subToggleInclude",
		label: "Include sub-genres: influences",
		hint: 'toggle "Include sub-genres" for "influences"',
		defaultBindings: ["ctrl+KeyX"],
	},
	{
		id: "toggleSubEitherInclude",
		group: "subToggleInclude",
		label: "Include sub-genres: either",
		hint: 'toggle "Include sub-genres" for "either"',
		defaultBindings: ["ctrl+KeyC"],
	},
	{
		id: "toggleSubDescriptorInclude",
		group: "subToggleInclude",
		label: "Include sub-genres: descriptors",
		hint: 'toggle "Include sub-genres" for "descriptors"',
		defaultBindings: ["ctrl+KeyS"],
	},
	{
		id: "toggleSubGenreExclude",
		group: "subToggleExclude",
		label: "Exclude sub-genres: genres",
		hint: 'toggle "Exclude sub-genres" for "genres"',
		defaultBindings: ["ctrl+shift+KeyZ"],
	},
	{
		id: "toggleSubInfluenceExclude",
		group: "subToggleExclude",
		label: "Exclude sub-genres: influences",
		hint: 'toggle "Exclude sub-genres" for "influences"',
		defaultBindings: ["ctrl+shift+KeyX"],
	},
	{
		id: "toggleSubEitherExclude",
		group: "subToggleExclude",
		label: "Exclude sub-genres: either",
		hint: 'toggle "Exclude sub-genres" for "either"',
		defaultBindings: ["ctrl+shift+KeyC"],
	},
	{
		id: "toggleSubDescriptorExclude",
		group: "subToggleExclude",
		label: "Exclude sub-genres: descriptors",
		hint: 'toggle "Exclude sub-genres" for "descriptors"',
		defaultBindings: ["ctrl+shift+KeyS"],
	},
	{
		id: "toggleAllGenreInclude",
		group: "allToggleInclude",
		label: "Must contain all: genres",
		hint: 'toggle "Must contain all" for "genres"',
		defaultBindings: ["ctrl+KeyQ"],
	},
	{
		id: "toggleAllInfluenceInclude",
		group: "allToggleInclude",
		label: "Must contain all: influences",
		hint: 'toggle "Must contain all" for "influences"',
		defaultBindings: ["ctrl+KeyW"],
	},
	{
		id: "toggleAllEitherInclude",
		group: "allToggleInclude",
		label: "Must contain all: either",
		hint: 'toggle "Must contain all" for "either"',
		defaultBindings: ["ctrl+KeyE"],
	},
	{
		id: "toggleAllDescriptorInclude",
		group: "allToggleInclude",
		label: "Must contain all: descriptors",
		hint: 'toggle "Must contain all" for "descriptors"',
		defaultBindings: ["ctrl+KeyA"],
	},
	{
		id: "toggleAllGenreExclude",
		group: "allToggleExclude",
		label: "Only exclude containing all: genres",
		hint: 'toggle "Only exclude items containing all" for "genres"',
		defaultBindings: ["ctrl+shift+KeyQ"],
	},
	{
		id: "toggleAllInfluenceExclude",
		group: "allToggleExclude",
		label: "Only exclude containing all: influences",
		hint: 'toggle "Only exclude items containing all" for "influences"',
		defaultBindings: ["ctrl+shift+KeyW"],
	},
	{
		id: "toggleAllEitherExclude",
		group: "allToggleExclude",
		label: "Only exclude containing all: either",
		hint: 'toggle "Only exclude items containing all" for "either"',
		defaultBindings: ["ctrl+shift+KeyE"],
	},
	{
		id: "toggleAllDescriptorExclude",
		group: "allToggleExclude",
		label: "Only exclude containing all: descriptors",
		hint: 'toggle "Only exclude items containing all" for "descriptors"',
		defaultBindings: ["ctrl+shift+KeyA"],
	},
	{
		id: "onlyRatingsSelf",
		group: "advancedUser",
		label: "Only ratings from myself",
		hint: 'toggle "Only include ratings from myself"',
		defaultBindings: ["ctrl+KeyR"],
	},
	{
		id: "onlyRatingsFollowing",
		group: "advancedUser",
		label: "Only ratings from users I'm following",
		hint: 'toggle "Only include ratings from users I\'m following"',
		defaultBindings: ["ctrl+KeyF"],
	},
	{
		id: "onlyRatingsFollowers",
		group: "advancedUser",
		label: "Only ratings from users who follow me",
		hint: 'toggle "Only include ratings from users who follow me"',
		defaultBindings: ["ctrl+KeyV"],
	},
	{
		id: "excludeRated",
		group: "advancedExclude",
		label: "Exclude releases I've rated",
		hint: 'toggle "Exclude releases I\'ve rated"',
		defaultBindings: ["ctrl+shift+KeyR"],
	},
	{
		id: "excludeCataloged",
		group: "advancedExclude",
		label: "Exclude releases I've cataloged",
		hint: 'toggle "Exclude releases I\'ve cataloged"',
		defaultBindings: ["ctrl+shift+KeyF"],
	},
	{
		id: "excludeWishlisted",
		group: "advancedExclude",
		label: "Exclude releases I've wishlisted",
		hint: 'toggle "Exclude releases I\'ve wishlisted"',
		defaultBindings: ["ctrl+shift+KeyV"],
	},
	{
		id: "updateChart",
		group: "updateChart",
		label: "Update chart",
		hint: '"Update chart"',
		// event.code distinguishes the main Enter key from the numpad one - the
		// original event.key-based handler matched both, so both are kept here
		// to avoid a silent regression for numpad-Enter users.
		defaultBindings: ["ctrl+Enter", "ctrl+Space", "ctrl+NumpadEnter"],
	},
];
