"use no memo";

import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface Props {
  username: string;
  count: number;
}

export function HelloWidget({ username, count }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
      }}
    >
      <TextWidget
        text={username}
        style={{ fontSize: 24, color: '#333333' }}
      />
      <TextWidget text={`${count} thông báo`} />
    </FlexWidget>
  );
}