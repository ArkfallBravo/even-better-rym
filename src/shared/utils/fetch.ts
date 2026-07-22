import type {
	FetchRequest,
	FetchResponse,
	ScriptRequest,
	ScriptResponse,
} from "./messaging";
import { sendBackgroundMessage } from "./messaging";

export const fetch = async (data: FetchRequest["data"]): Promise<string> => {
	// Try a direct fetch from the content script first. On iOS Safari, the
	// background page can't reach external APIs even with host permissions, so
	// we use direct CORS fetches when the API supports it (most do). Fall back
	// to the background path for APIs that don't allow cross-origin access.
	try {
		const url = new URL(data.url);
		if (data.urlParameters) {
			for (const [key, value] of Object.entries(data.urlParameters))
				url.searchParams.append(key, value);
		}
		const response = await globalThis.fetch(url.toString(), {
			method: data.method,
			headers: data.headers,
			credentials: data.credentials,
			body: data.body,
		});
		if (response.ok) return await response.text();
	} catch {
		// fall through to background fetch
	}

	const response = await sendBackgroundMessage<FetchRequest, FetchResponse>({
		type: "fetch",
		data,
	});
	if (response.data.error) throw new Error(response.data.error);
	return response.data.body;
};

/**
 * Perform a `fetch` from the page's main world instead of the background
 * script. This is useful when you need the request to run with the page's
 * cookies, CSP, or any other context that the background fetch doesn't share.
 *
 * The helper injects a tiny script into the page which does the network call
 * and posts the result back via `window.postMessage`.
 */
export const fetchInPage = async (
	data: FetchRequest["data"],
): Promise<string> => {
	const requestId = crypto.randomUUID();

	return new Promise<string>((resolve) => {
		const listener = (
			event: MessageEvent<{ type: string; id: string; body: string }>,
		) => {
			if (
				event.source === window &&
				event.data?.type === "PAGE_FETCH_RESULT" &&
				event.data.id === requestId
			) {
				window.removeEventListener("message", listener);
				resolve(event.data.body);
			}
		};

		window.addEventListener("message", listener);

		/**
		 * Serialize the request parameters so they survive injection;
		 * base64-encode the serialized object so that no characters can
		 * accidentally terminate the outer template string or introduce
		 * unbalanced parentheses when the script is injected into the page.
		 *
		 * Normal `btoa` throws when the string contains non-latin characters,
		 * which happens if the user’s preferences include emoji or accented
		 * letters.  Wrap it to handle arbitrary Unicode.
		 */
		const unicodeBase64 = (str: string) => {
			const bytes = new TextEncoder().encode(str);
			let binary = "";
			for (const byte of bytes) binary += String.fromCodePoint(byte);
			return btoa(binary);
		};
		const serialized = unicodeBase64(JSON.stringify(data));
		void sendBackgroundMessage<ScriptRequest, ScriptResponse>({
			type: "script",
			data: {
				// the injected script runs in the page's main world
				script: `;(async () => {
          try {
            // decode using the reverse of unicodeBase64()
            const req = JSON.parse(decodeURIComponent(escape(atob("${serialized}"))));
            const u = new URL(req.url);
            if (req.urlParameters) {
              for (const [k,v] of Object.entries(req.urlParameters))
                u.searchParams.append(k, v);
            }
            const res = await fetch(u.toString(), {
              method: req.method,
              headers: req.headers,
              credentials: req.credentials,
            });
            const body = await res.text();
            window.postMessage({
              type: 'PAGE_FETCH_RESULT',
              id: ${JSON.stringify(requestId)},
              body,
            }, '*');
          } catch (e) {
            window.postMessage({
              type: 'PAGE_FETCH_RESULT',
              id: ${JSON.stringify(requestId)},
              body: '',
            }, '*');
          }
        })();`,
			},
		});
	});
};
