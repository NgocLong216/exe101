export type LatLng = {
  latitude: number;
  longitude: number;
};

export type LocationResult = LatLng & {
  name?: string;
};
