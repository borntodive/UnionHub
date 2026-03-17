const dotenv = require('dotenv');
const path = require('path');

// Load the correct .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(__dirname, envFile) });

module.exports = {
  expo: {
    name: "UnionHub",
    slug: "unionhub",
    owner: "acovelli",
    newArchEnabled: true,
    version: "1.0.1",
    runtimeVersion: "1.0.0",
    updates: {
      url: "https://u.expo.dev/505f6694-7b00-484d-94cd-fcebdb0ee8e9",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#177246"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "it.unionhub.app",
      infoPlist: {
        UIViewControllerBasedStatusBarAppearance: false,
        CFBundleDocumentTypes: [
          {
            CFBundleTypeName: "PDF Document",
            CFBundleTypeRole: "Editor",
            LSHandlerRank: "Alternate",
            LSItemContentTypes: [
              "com.adobe.pdf"
            ]
          }
        ],
        UIImportedTypeDeclarations: [
          {
            UTTypeIdentifier: "com.adobe.pdf",
            UTTypeDescription: "PDF Document",
            UTTypeConformsTo: [
              "public.data"
            ],
            UTTypeTagSpecification: {
              "public.filename-extension": [
                "pdf"
              ],
              "public.mime-type": [
                "application/pdf"
              ]
            }
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#177246"
      },
      package: "it.unionhub.app",
      intentFilters: [
        {
          action: "VIEW",
          category: [
            "BROWSABLE",
            "DEFAULT"
          ],
          data: [
            {
              mimeType: "application/pdf"
            }
          ]
        },
        {
          action: "SEND",
          category: [
            "DEFAULT"
          ],
          data: [
            {
              mimeType: "application/pdf"
            }
          ]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-asset"
    ],
    // Extra config accessible via Constants.expoConfig.extra
    extra: {
      apiUrl: process.env.API_URL,
      environment: process.env.NODE_ENV || 'development',
      eas: {
        projectId: "505f6694-7b00-484d-94cd-fcebdb0ee8e9"
      }
    }
  }
};
