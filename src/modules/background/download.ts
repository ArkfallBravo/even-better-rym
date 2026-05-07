import browser from "webextension-polyfill";

import filenamify from "~/shared/utils/filenamify";
import type {
	DownloadRequest,
	DownloadResponse,
} from "~/shared/utils/messaging";

const mimeTypes: Record<string, string | undefined> = {
	"image/bmp": "bmp",
	"image/gif": "gif",
	"image/vnd.microsoft.icon": "ico",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/svg+xml": "svg",
	"image/tiff": "tiff",
	"image/webp": "webp",
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});

export const download = async (
	{ id, data }: DownloadRequest,
	tabId: number,
): Promise<DownloadResponse> => {
	const hasDownloadsApi = typeof browser.downloads?.download === "function";

	for (const { url, filename } of data) {
		try {
			const blob = await fetch(url).then((response) => {
				if (response.ok) {
					return response.blob();
				}
				throw new Error(`Status code: ${response.status}`);
			});
			const mimeTypeExtension = mimeTypes[blob.type];
			const urlExtension = url.split(".").pop();

			const urlExtensionPart =
				urlExtension === undefined ? "" : `.${urlExtension}`;
			const extension =
				mimeTypeExtension === undefined
					? urlExtensionPart
					: `.${mimeTypeExtension}`;
			const formattedFilename = filename.slice(0, 100 - extension.length);
			const filenameWithExtension = filenamify(
				`${formattedFilename}${extension}`,
			);

			if (hasDownloadsApi) {
				const downloadId = await browser.downloads.download({
					url,
					filename: filenameWithExtension,
				});
				return { id, type: "download", data: { id: downloadId } };
			}

			// Safari fallback: fetch happens in background (using host permissions),
			// then a data URL is injected into the page to trigger the browser's
			// native save dialog via an anchor click.
			const dataUrl = await blobToDataUrl(blob);
			await browser.scripting.executeScript({
				target: { tabId },
				func: (href: string, dlFilename: string) => {
					const a = document.createElement("a");
					a.href = href;
					a.download = dlFilename;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
				},
				args: [dataUrl, filenameWithExtension],
			});
			return { id, type: "download", data: { id: 0 } };
		} catch {
			// try next URL in the list
		}
	}

	throw new Error("None of the links worked");
};
