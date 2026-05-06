const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      // INCOLLA QUI LO SNIPPET RICEVUTO DA GOOGLE
      const fileContent = `DJ6ZLOSTDFBD4AAAAAAAAAAAAA`;

      const assetsPath = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/assets",
      );

      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(assetsPath, "adi-registration.properties"),
        fileContent,
      );
      return config;
    },
  ]);
};
