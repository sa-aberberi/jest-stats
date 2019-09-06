# jest-stats

A small custom [Jest reporter](https://jestjs.io/docs/en/configuration#reporters-array-modulename-modulename-options) that reports timing-related stats about your unit tests, including listing out any slow suites and individual tests, as well as averages and medians of tests and suite times.

### Usage (in the MW monorepo)

Clone this repo somewhere (like `/git/jest-stats`) and then `yarn` to install dependencies.

Then:

```
# link the package to be able to use it in MW (since it's not listed as a dep)
cd ~/git/jest-stats
yarn link
cd ~/git/magicwand
yarn link jest-stats

# run your tests
# `time` is optional but can provide additional insights
# replace `magic-wand-client` with `magicwand-widget` or any other package with jest tests
time yarn lerna exec --scope magic-wand-client "yarn cross-env NODE_ENV=test jest --reporters='jest-stats'"

# optionally unlink the package afterwards
cd ~/git/jest-stats
yarn unlink
```

You can obviously wrap all of the above into an alias or function for convenience.
