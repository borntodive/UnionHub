## fastlane documentation

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Capture screenshots using Detox and organize them

### ios generate_backgrounds

```sh
[bundle exec] fastlane ios generate_backgrounds
```

Generate Frameit backgrounds with brand color

### ios upload_metadata

```sh
[bundle exec] fastlane ios upload_metadata
```

Upload metadata to App Store Connect

### ios store_assets

```sh
[bundle exec] fastlane ios store_assets
```

Upload screenshots and metadata to App Store Connect

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Prepare and upload beta build

---

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
