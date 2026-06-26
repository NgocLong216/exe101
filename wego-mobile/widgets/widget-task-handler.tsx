import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps, ImageWidgetSource } from 'react-native-android-widget';
import { MapWidget } from './MapWidget';

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY_2;

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE': {
      const offset = 0.0001
      const lat = await AsyncStorage.getItem('widget_lat');
      const lng = await AsyncStorage.getItem('widget_lng');

      const latitude = lat ? parseFloat(lat) : 10.7769;
      const longitude = lng ? parseFloat(lng) : 106.7009;

      const mapUrl = `https://rsapi.goong.io/staticmap/route?origin=${latitude+offset},${longitude}&destination=${latitude},${longitude}&width=400&height=200&vehicle=car&api_key=${GOONG_API_KEY}` as ImageWidgetSource ;

      props.renderWidget(
        <MapWidget
          latitude={latitude}
          longitude={longitude}
          Image={mapUrl}
        />
      );
      break;
    }

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}

export { widgetTaskHandler };