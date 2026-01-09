import { Linking, Platform } from "react-native";

export interface PlaceCoordinates {
  latitude: number;
  longitude: number;
  label?: string;
}

export function openMapsNavigation(coords: PlaceCoordinates): void {
  const { latitude, longitude, label } = coords;
  
  if (Platform.OS === "web") {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, "_blank");
  } else {
    const encodedLabel = label ? encodeURIComponent(label) : "";
    const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        Linking.openURL(webUrl);
      }
    });
  }
}

export function openMapsLocation(coords: PlaceCoordinates): void {
  const { latitude, longitude, label } = coords;
  
  if (Platform.OS === "web") {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(url, "_blank");
  } else {
    const encodedLabel = label ? encodeURIComponent(label) : "";
    const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(webUrl);
      }
    });
  }
}
