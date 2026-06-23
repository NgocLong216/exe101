import { useLocalSearchParams } from "expo-router";

import { useEffect } from "react";

import { joinGroup } from '@/apis/groupAPI';

export default function InvitePage(){

  const { inviteCode }
  = useLocalSearchParams();

  useEffect(() => {

    if(inviteCode){

      joinGroup(
        inviteCode as string
      );

    }

  },[inviteCode]);

  return null;
}