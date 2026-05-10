#!/bin/bash
set -e

UDID="C59A21C3-2D08-479E-9526-57A7F4D72079"
LANG=${1:-en}  # "en" or "it"

if [ "$LANG" = "it" ]; then
  LANGUAGES="it"
  LOCALE="it_IT"
  FLOW=".maestro/screenshots_it.yaml"
  OUTPUT="artifacts/screenshots/it-IT"
else
  LANGUAGES="en-US"
  LOCALE="en_US"
  FLOW=".maestro/screenshots_en.yaml"
  OUTPUT="artifacts/screenshots/en-US"
fi

echo "Setting simulator locale to $LOCALE..."
xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLanguages -array "$LANGUAGES"
xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLocale -string "$LOCALE"

echo "Rebooting simulator to apply locale..."
xcrun simctl reboot "$UDID" 2>/dev/null || true
sleep 8

echo "Launching app..."
xcrun simctl launch "$UDID" it.acovelli.unionhub
sleep 3

echo "Running Maestro flow ($LANG)..."
maestro test --output "$OUTPUT" "$FLOW"
