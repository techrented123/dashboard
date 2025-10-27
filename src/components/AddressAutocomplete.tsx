import { useCallback, useRef } from "react";
import { useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import { cn } from "../lib/utils";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

interface InputRef extends HTMLInputElement {
  getPlaces: () => any;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your address",
  className = "",
  error = false,
}: AddressAutocompleteProps) => {
  const inputRef = useRef<InputRef | null>();

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyBpwVIGGL--8Rb8boLBeYANil7eovl8ND8",
    libraries: ["places"],
    region: "ca",
  });

  const handleOnPlacesChanged = useCallback(() => {
    console.log("🟢 places_changed event fired!");

    let places;
    if (inputRef.current) {
      places = inputRef.current.getPlaces();
    }

    console.log("Places result:", places);

    if (!places || !places[0]) {
      console.log("❌ No places found");
      return;
    }

    const place = places[0];
    console.log("Selected place:", place);

    const addressComponents = place.address_components;

    if (!addressComponents || addressComponents.length === 0) {
      console.log("❌ No address_components found");
      return;
    }

    console.log("✅ Parsing address_components:", addressComponents);

    let city: string | undefined;
    let province: string | undefined;
    let postalCode: string | undefined;
    let street_address = "";
    let country: string | undefined;

    addressComponents.forEach((component: any) => {
      console.log(
        "   Component:",
        component.long_name,
        "Types:",
        component.types
      );

      if (component.types.includes("street_number")) {
        street_address = component.long_name;
      }
      if (component.types.includes("route")) {
        street_address += " " + component.long_name;
      }
      if (component.types.includes("locality")) {
        city = component.long_name;
      }
      if (component.types.includes("administrative_area_level_1")) {
        province = component.short_name || component.long_name;
      }
      if (component.types.includes("postal_code")) {
        postalCode = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.long_name;
      }
    });

    street_address = street_address.trim();

    const parsedData = {
      street: street_address || place.formatted_address || place.name || "",
      city: city || "",
      province: province || "",
      postalCode: postalCode || "",
      country: country || "",
    };

    console.log("📤 Will send to parent:", parsedData);

    // Update the main address field
    onChange(street_address || place.formatted_address || place.name || "");

    // Call the onAddressSelect callback with parsed address
    try {
      onAddressSelect(parsedData);
      console.log("✅ Successfully called onAddressSelect");
    } catch (error) {
      console.error("❌ Error calling onAddressSelect:", error);
    }
  }, [onChange, onAddressSelect]);

  const loadHandler = useCallback((ref: any) => {
    console.log("SearchBox loaded with ref:", ref);
    inputRef.current = ref;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black dark:text-black ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
      />
    );
  }

  return (
    <StandaloneSearchBox
      onLoad={loadHandler}
      onPlacesChanged={handleOnPlacesChanged}
    >
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black dark:text-black ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
      />
    </StandaloneSearchBox>
  );
};
