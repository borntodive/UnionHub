import { useState, useEffect } from "react";
import * as Location from "expo-location";

export type LocationPermissionStatus =
  | "undetermined"
  | "granted"
  | "denied"
  | "never_ask_again";

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface UseLocationResult {
  location: LocationData | null;
  permission: LocationPermissionStatus;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  getCurrentLocation: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permission, setPermission] =
    useState<LocationPermissionStatus>("undetermined");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check permission status on mount
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermission(status as LocationPermissionStatus);
    } catch (err) {
      setError("Failed to check location permission");
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status as LocationPermissionStatus);

      if (status === "granted") {
        await getCurrentLocation();
      } else {
        setError("Location permission denied");
      }
    } catch (err) {
      setError("Failed to request location permission");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      setError("Failed to get current location");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    location,
    permission,
    isLoading,
    error,
    requestPermission,
    getCurrentLocation,
  };
}
