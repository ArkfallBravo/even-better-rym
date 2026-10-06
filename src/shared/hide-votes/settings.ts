const STORAGE_KEY = "brym.voteVisibilitySettings";

export type VoteVisibilitySettings = {
	genres: boolean;
	descriptors: boolean;
	hideStats: boolean;
};

type VoteVisibilitySettingsOverrides = Partial<VoteVisibilitySettings>;

export const defaultVoteVisibilitySettings = (): VoteVisibilitySettings => ({
	genres: true,
	descriptors: true,
	hideStats: false,
});

export const mergeVoteVisibilitySettings = (
	overrides: VoteVisibilitySettingsOverrides = {},
): VoteVisibilitySettings => ({
	...defaultVoteVisibilitySettings(),
	...overrides,
});

export const getVoteVisibilitySettings =
	async (): Promise<VoteVisibilitySettings> => {
		const { getStoredSetting } = await import("~/shared/utils/stored-settings");
		return mergeVoteVisibilitySettings(
			await getStoredSetting<VoteVisibilitySettingsOverrides>(STORAGE_KEY),
		);
	};

export const setVoteVisibilitySettings = async (
	settings: VoteVisibilitySettings,
): Promise<void> => {
	const { setStoredSetting } = await import("~/shared/utils/stored-settings");
	await setStoredSetting(STORAGE_KEY, settings);
};
