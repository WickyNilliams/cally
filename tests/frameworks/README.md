# Framework tests

Each directory is a small app, which uses cally as described in the
[frameworks guide](../../docs/src/pages/guides/frameworks.astro). They check
that it works with each framework's own way of setting props and handling
events, and that the types from the guide work.

```sh
npm run test:frameworks              # all of them
npm run test:frameworks -- react vue # only these
```

The tests are the same for every framework, as cally should work the same in
each. They're in `shared/suite.ts`, along with what each app must render. Each
app's test only says how to mount it in that framework.

This builds cally and packs it as it would be published, then installs it into
each app before running `npm run check` (types) and `npm test` there.

Each app has its own lockfile, and pins exact versions, so nothing changes
unless a version is changed deliberately. To update a framework, change its
version in that app's `package.json`, then run `npm install` in that directory.
cally itself is not in the lockfile, as it is installed from the packed build
each time.

Where something is known not to work, the test says why, and expects it to fail.
That way the test fails once it is fixed, as a reminder to update it.
