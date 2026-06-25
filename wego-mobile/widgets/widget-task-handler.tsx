// widgets/widget-task-handler.tsx
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { HelloWidget } from './HelloWidget';

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
      props.renderWidget(<HelloWidget username="Bạn" count={5} />);
      break;

    case 'WIDGET_DELETED':
      // Handle delete để tránh crash
      break;
    default:
      break;
  }
}

export { widgetTaskHandler };