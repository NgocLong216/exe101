"use no memo";

import { FlexWidget, ImageWidget, TextWidget, ImageWidgetSource } from 'react-native-android-widget';

interface Props {
  latitude: number;
  longitude: number;
  Image: ImageWidgetSource;
}

export function MapWidget({ latitude, longitude, Image }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 16,
      }}
    >
      {Image ? (
        <ImageWidget
          image={Image}
          imageWidth={400}
          imageHeight={200}  // giữ tỉ lệ 600x400 → 300x200
        />
      ) : (
        <FlexWidget
          style={{
            width: 300,
            height: 150,
            backgroundColor: '#E5E7EB',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Đang tải bản đồ..."
            style={{ fontSize: 12, color: '#6B7280' }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}