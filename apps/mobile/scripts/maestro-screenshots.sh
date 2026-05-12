#!/bin/bash

# Device UDIDs (iOS 18.2)
IPHONE_MAX_UDID="25647B35-33C8-4FEC-B5E6-FF0ED1D9B135"   # iPhone 16 Pro Max (6.9")
IPAD_UDID="AF68CD12-9FDC-4E82-B7B1-29B9156CBD9C"          # iPad Pro 13" (M4)

APP_ID="it.acovelli.unionhub"
LANG=${1:-en}

# Screenshot names defined in the flow
SCREENSHOTS=("01_payslip" "02_ftl" "03_ctc" "04_airports")

if [ "$LANG" = "it" ]; then
  LANGUAGES="it"
  LOCALE="it_IT"
  FLOW_PHONE=".maestro/screenshots_it.yaml"
  FLOW_IPAD=".maestro/screenshots_ipad_it.yaml"
  FASTLANE_OUT="fastlane/screenshots/it"
else
  LANGUAGES="en-US"
  LOCALE="en_US"
  FLOW_PHONE=".maestro/screenshots_en.yaml"
  FLOW_IPAD=".maestro/screenshots_ipad_en.yaml"
  FASTLANE_OUT="fastlane/screenshots/en-US"
fi

set_locale_and_launch() {
  local UDID=$1
  echo "  Setting locale $LOCALE on $UDID..."
  xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLanguages -array "$LANGUAGES"
  xcrun simctl spawn "$UDID" defaults write NSGlobalDomain AppleLocale -string "$LOCALE"
  xcrun simctl reboot "$UDID" 2>/dev/null || true
  sleep 8
  xcrun simctl launch "$UDID" "$APP_ID" || true
  sleep 3
}

resize_png() {
  local file=$1
  local width=$2
  local height=$3
  sips -z "$height" "$width" "$file" --out "$file" > /dev/null 2>&1
}

collect_screenshots() {
  local PREFIX=$1
  local ARTIFACTS_DIR=$2
  local TARGET_W=$3
  local TARGET_H=$4

  mkdir -p "$ARTIFACTS_DIR" "$FASTLANE_OUT"

  for name in "${SCREENSHOTS[@]}"; do
    src="${name}.png"  # Maestro saves in CWD
    if [ -f "$src" ]; then
      dest_artifacts="$ARTIFACTS_DIR/${name}.png"
      dest_fastlane="$FASTLANE_OUT/${PREFIX}_${name}.png"
      cp "$src" "$dest_artifacts"
      cp "$src" "$dest_fastlane"
      rm "$src"  # clean up CWD
      # Resize to App Store required dimensions
      resize_png "$dest_artifacts" "$TARGET_W" "$TARGET_H"
      resize_png "$dest_fastlane"  "$TARGET_W" "$TARGET_H"
      echo "  ✓ ${PREFIX}_${name}.png (${TARGET_W}×${TARGET_H})"
    else
      echo "  ✗ ${name}.png not found"
    fi
  done
}

mkdir -p "$FASTLANE_OUT"

# --- iPhone 16 Pro Max (6.9") ---
echo ""
echo "=== iPhone 16 Pro Max ==="
set_locale_and_launch "$IPHONE_MAX_UDID"
maestro --device "$IPHONE_MAX_UDID" test "$FLOW_PHONE" || true
collect_screenshots "iphone_max" "artifacts/screenshots/$LANG/iphone_max" 1284 2778

# --- iPad Pro 13" ---
echo ""
echo "=== iPad Pro 13\" ==="
set_locale_and_launch "$IPAD_UDID"
maestro --device "$IPAD_UDID" test "$FLOW_IPAD" || true
collect_screenshots "ipad" "artifacts/screenshots/$LANG/ipad" 2048 2732

echo ""
echo "Done."
echo "  artifacts/screenshots/$LANG/iphone_max/"
echo "  artifacts/screenshots/$LANG/ipad/"
echo "  $FASTLANE_OUT/  (prefixed: iphone_max_* / ipad_*)"
