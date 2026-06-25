import { useAuth } from "@/auth0/AuthContext";

import { joinGroup } from "@/apis/groupAPI";

import {
  router,

  useLocalSearchParams
} from "expo-router";

import {
  useEffect
} from "react";

import {
  ActivityIndicator,

  Alert,

  View
} from "react-native";

import {
  saveInviteCode
} from "@/utils/deepLinkStorage";

export default function InvitePage() {

  const { user } = useAuth();

  const { inviteCode }
    = useLocalSearchParams();

  useEffect(() => {

    const handleInvite = async () => {

      if (!inviteCode) {

        return;

      }

      // Chưa login

      if (!user) {

        await saveInviteCode(
          inviteCode as string
        );

        router.replace(
          "/login"
        );

        return;

      }

      try {

        await joinGroup(
          inviteCode as string
        );

        Alert.alert(
          "Success",
          "Joined group"
        );

        router.replace(
          "/(tabs)/groups"
        );

      }

      catch (error) {

        console.log(error);

        Alert.alert(
          "Error",
          "Cannot join group"
        );

        router.replace(
          "/(tabs)/groups"
        );

      }

    };

    handleInvite();

  },

  [inviteCode, user]);

  return (

    <View

      style={{

        flex:1,

        justifyContent:"center",

        alignItems:"center"

      }}

    >

      <ActivityIndicator
        size="large"
      />

    </View>

  );

}