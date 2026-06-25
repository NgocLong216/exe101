import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pendingInvite";

export async function saveInviteCode(
  inviteCode: string
) {

  await AsyncStorage.setItem(
    KEY,
    inviteCode
  );

}

export async function getInviteCode() {

  return await AsyncStorage.getItem(
    KEY
  );

}

export async function clearInviteCode() {

  await AsyncStorage.removeItem(
    KEY
  );

}