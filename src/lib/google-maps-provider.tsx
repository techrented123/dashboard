import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: null,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("GoogleMapsProvider: Initializing...");

    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log("Google Maps API already loaded");
      setIsLoaded(true);
      return;
    }

    console.log("Loading Google Maps API script...");

    // Create script element
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBpwVIGGL--8Rb8boLBeYANil7eovl8ND8&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("Google Maps script loaded, checking for API...");
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log("Google Maps API is ready!");
        setIsLoaded(true);
      } else {
        console.error("Google Maps API failed to load properly");
        setLoadError(new Error("Google Maps API failed to load"));
      }
    };

    script.onerror = () => {
      console.error("Failed to load Google Maps API script");
      setLoadError(new Error("Failed to load Google Maps API script"));
    };

    document.head.appendChild(script);

    return () => {
      // Clean up script on unmount
      const scripts = document.querySelectorAll(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      );
      scripts.forEach((s) => s.remove());
    };
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
