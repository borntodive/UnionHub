import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";

export interface SharedFile {
  uri: string;
  mimeType: string;
  name: string;
  size?: number;
}

// This hook handles files shared TO the app from other apps
// For iOS/Android file sharing, we use deep linking with URL parameters
export const useSharedFile = () => {
  const [sharedFile, setSharedFile] = useState<SharedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse the incoming URL for shared file data
  const handleIncomingURL = useCallback((url: string) => {
    try {
      setIsProcessing(true);

      // Parse the URL
      const parsedUrl = Linking.parse(url);

      // Check if this is a file share intent
      if (parsedUrl.queryParams?.sharedFileUri) {
        const fileUri = parsedUrl.queryParams.sharedFileUri as string;
        const mimeType =
          (parsedUrl.queryParams.mimeType as string) || "application/pdf";
        const name =
          (parsedUrl.queryParams.fileName as string) || "shared-file.pdf";

        const file: SharedFile = {
          uri: fileUri,
          mimeType,
          name,
        };

        setSharedFile(file);
        return file;
      }

      return null;
    } catch (error) {
      console.error("Error parsing shared file URL:", error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Check for initial URL (app opened via share)
  useEffect(() => {
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleIncomingURL(initialUrl);
      }
    };

    getInitialURL();
  }, [handleIncomingURL]);

  // Listen for URL changes while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener(
      "url",
      (event: { url: string }) => {
        handleIncomingURL(event.url);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [handleIncomingURL]);

  // Clear the shared file after processing
  const clearSharedFile = useCallback(() => {
    setSharedFile(null);
  }, []);

  return {
    sharedFile,
    isProcessing,
    clearSharedFile,
  };
};
