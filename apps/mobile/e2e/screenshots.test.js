const { by, element, waitFor } = require("detox");
const {
  takeScreenshot,
  loginWithQuickUser,
  navigateToScreen,
} = require("./helpers/detox");

describe("App Store Screenshots", () => {
  beforeAll(async () => {
    await device.launchApp({
      languageAndLocale: {
        language: "en-US",
        locale: "en-US",
      },
    });
  });

  // English Screenshots
  describe("English (en-US)", () => {
    it("01 - Login Screen", async () => {
      await waitFor(element(by.id("login-screen")))
        .toBeVisible()
        .withTimeout(10000);
      await takeScreenshot("en-US/01_login");
    });

    it("02 - Home Screen", async () => {
      await loginWithQuickUser();

      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(15000);
      await takeScreenshot("en-US/02_home");
    });

    it("03 - Documents Screen", async () => {
      await navigateToScreen("documents-drawer-item");

      await waitFor(element(by.id("documents-screen")))
        .toBeVisible()
        .withTimeout(5000);
      await takeScreenshot("en-US/03_documents");
    });

    it("04 - Notifications Screen", async () => {
      await navigateToScreen("notifications-drawer-item");

      await waitFor(element(by.id("notifications-screen")))
        .toBeVisible()
        .withTimeout(5000);
      await takeScreenshot("en-US/04_notifications");
    });

    it("05 - Profile Screen", async () => {
      await navigateToScreen("profile-drawer-item");

      await waitFor(element(by.id("profile-screen")))
        .toBeVisible()
        .withTimeout(5000);
      await takeScreenshot("en-US/05_profile");
    });
  });

  // Italian Screenshots
  describe("Italian (it-IT)", () => {
    beforeAll(async () => {
      await device.launchApp({
        languageAndLocale: {
          language: "it",
          locale: "it_IT",
        },
        delete: true,
      });
    });

    it("01 - Login Screen (IT)", async () => {
      await waitFor(element(by.id("login-screen")))
        .toBeVisible()
        .withTimeout(10000);
      await takeScreenshot("it-IT/01_login");
    });

    it("02 - Home Screen (IT)", async () => {
      await loginWithQuickUser();

      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(15000);
      await takeScreenshot("it-IT/02_home");
    });

    it("03 - Documents Screen (IT)", async () => {
      await navigateToScreen("documents-drawer-item");

      await waitFor(element(by.id("documents-screen")))
        .toBeVisible()
        .withTimeout(5000);
      await takeScreenshot("it-IT/03_documents");
    });

    it("04 - Notifications Screen (IT)", async () => {
      await navigateToScreen("notifications-drawer-item");

      await waitFor(element(by.id("notifications-screen")))
        .toBeVisible()
        .withTimeout(5000);
      await takeScreenshot("it-IT/04_notifications");
    });

    it("05 - Profile Screen (IT)", async () => {
      await navigateToScreen("profile-drawer-item");

      await waitFor(element(by.id("profile-screen")))
        .toBeVisible()
        .withTimeout(5000);
      await takeScreenshot("it-IT/05_profile");
    });
  });
});
