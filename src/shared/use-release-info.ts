import { useCallback, useState } from "preact/hooks";

import type { Resolvable, ResolveData, Service } from "./services/types";
import type { OneShot } from "./utils/one-shot";
import { complete, failed, initial, loading } from "./utils/one-shot";

export type InfoState = OneShot<Error, ResolveData>;
export type FetchFunction = (
	url: string,
	service: Service & Resolvable,
) => Promise<InfoState>;
export type UseReleaseInfoValue = {
	info: InfoState;
	setInfo: (info: InfoState) => void;
	fetchInfo: FetchFunction;
};

export const useReleaseInfo = (): UseReleaseInfoValue => {
	const [info, setInfo] = useState<InfoState>(initial);

	const fetchInfo: FetchFunction = useCallback(async (url, service) => {
		setInfo(loading);
		const nextInfo = await service
			.resolve(url)
			.then((data) => complete(data))
			.catch((error) => failed(error));
		if (nextInfo.type !== "complete") setInfo(nextInfo);
		return nextInfo;
	}, []);

	return { info, setInfo, fetchInfo };
};
