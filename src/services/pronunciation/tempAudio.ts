import { File } from 'expo-file-system';

/** Recordings are only needed for one assessment: remove them as soon as it settles. */
export function deleteRecording(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone, or the OS cleans the cache itself.
  }
}
