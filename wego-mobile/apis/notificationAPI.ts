const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const updateNotificationSetting = async (
    enabled: boolean,
    token: string
  ) => {
  
    await fetch(
      `${API_URL}/api/users/notification-setting`,
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