import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * How this phone is named to the server: in the session list, and in the Telegram bot's
 * "sign in from Samsung SM-A515F · Android 14?" prompt, where the person must recognise their phone.
 */
export function deviceLabel(maxLength = 120): string {
  const system = Device.osName ? `${Device.osName} ${Device.osVersion ?? ''}`.trim() : `${Platform.OS} ${Platform.Version}`;
  return [modelLabel(), system].filter(Boolean).join(' · ').slice(0, maxLength);
}

/** "iPhone 15", "Google Pixel 8", "Samsung SM-A515F": the maker only where the model name lacks it. */
function modelLabel(): string | null {
  const model = Device.modelName;
  const maker = Platform.OS === 'ios' ? null : Device.manufacturer;
  if (!maker) return model;
  const brand = maker.charAt(0).toUpperCase() + maker.slice(1);
  if (!model) return brand;
  return model.toLowerCase().startsWith(maker.toLowerCase()) ? model : `${brand} ${model}`;
}
