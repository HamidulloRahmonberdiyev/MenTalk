import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type AvatarSource = 'camera' | 'library';

export class CameraPermissionDenied extends Error {
  constructor() {
    super('Camera permission denied');
    this.name = 'CameraPermissionDenied';
  }
}

/** Big enough for a sharp 3x avatar, small enough (~50 KB) to upload in a moment on mobile data. */
const SIZE = 512;

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 1 };

/** Lets the learner pick and square-crop a photo, then shrinks it to a JPEG. Null when they cancel. */
export async function pickAvatar(source: AvatarSource): Promise<string | null> {
  if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
    throw new CameraPermissionDenied();
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  if (result.canceled) return null;

  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: SIZE, height: null }).renderAsync();
  const { uri } = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return uri;
}
