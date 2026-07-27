export type RYMChartApi = {
	addBrowserItem: (filterType: string, itemId: number, name: string) => void;
	removeBrowserItem: (...args: unknown[]) => unknown;
	onClickCreateChart: () => void;
};

declare global {
	interface Window {
		RYMchart?: RYMChartApi;
	}
}
