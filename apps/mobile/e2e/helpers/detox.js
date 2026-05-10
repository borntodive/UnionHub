const { by, element, waitFor } = require("detox");

// Helper function for delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForAppToBeReady = async () => {
  await device.launchApp();
  await sleep(2000); // Wait for app to fully load
  await waitFor(element(by.id("login-screen")))
    .toBeVisible()
    .withTimeout(15000);
};

const takeScreenshot = async (name) => {
  await device.takeScreenshot(name);
};

const loginWithQuickUser = async () => {
  // Wait for screen to stabilize
  await sleep(1000);

  // Tap crewcode input with offset to avoid Quick Users overlay
  await element(by.id("crewcode-input")).tapAtPoint({ x: 20, y: 5 });
  await sleep(200);

  // Type crewcode
  await element(by.id("crewcode-input")).typeText("COVEAN");
  await sleep(200);

  // Tap password input
  await element(by.id("password-input")).tapAtPoint({ x: 20, y: 5 });
  await sleep(200);

  // Type password
  await element(by.id("password-input")).typeText("password");
  await sleep(200);

  // Tap login button (using center of button)
  await element(by.id("login-button")).tap();
};

const openDrawer = async () => {
  await sleep(500);

  // Try to tap the menu button using testID
  try {
    await waitFor(element(by.id("menu-button")))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.id("menu-button")).tap();
  } catch (err) {
    // Fallback: tap at left edge of screen
    await element(by.type("RCTView")).atIndex(0).tap();
  }
};

const navigateToScreen = async (drawerItemId) => {
  await openDrawer();
  await sleep(1000); // Wait for drawer animation

  // Wait for drawer item to be visible
  await waitFor(element(by.id(drawerItemId)))
    .toBeVisible()
    .withTimeout(8000);

  await sleep(300);
  await element(by.id(drawerItemId)).tap();
};

module.exports = {
  waitForAppToBeReady,
  takeScreenshot,
  loginWithQuickUser,
  openDrawer,
  navigateToScreen,
};
