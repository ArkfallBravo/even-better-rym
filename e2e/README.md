# Safari import e2e check

Drives the real macOS Safari extension (not vitest, not Chromium) through the
release-submission "Import" form once per resolvable service, to catch
Safari-specific background-fetch failures that Node's CORS-free `fetch`
can't reproduce.

## One-time setup

1. Safari > Develop menu > enable "Allow Remote Automation".
2. Run `safaridriver --enable` once (may prompt for your password).
3. Build and enable the extension in Safari > Settings > Extensions, same as
   manual testing.
4. Copy `urls.example.json` to `urls.json` and fill in a real submission page
   URL plus one known-good release URL per service. `urls.json` is
   gitignored — it's local test data, not something to commit.

## Run

```sh
npm run test:e2e:safari
```

## Caveat

Resolved results are cached in extension storage for an hour
(`withCache` in `src/shared/utils/cache.ts`). A cached success from before a
regression reads as a false pass; a cached failure reads as a false fail.
Clear the extension's storage (or wait out the cache) before running if you
need a clean read.
