const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const updateLocationSharing = async (
    enabled: boolean,
    token: string
  ) => {
  
    await fetch(
      `${API_URL}/api/users/location-sharing`,
      {
        method: 'PATCH',
  
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
  
        body: JSON.stringify({
          enabled,
        }),
      }
    );
  };