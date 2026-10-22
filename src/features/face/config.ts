/** Which mascot the conversation screen shows. */
export type ChatMascot = "avatar3d" | "rive";

/**
 * Feature flag: flip to `'rive'` to show the SOBO mascot in conversations (try it in /face-lab first).
 * SOBO needs a development build; on web or if Rive fails it falls back to the SVG face.
 */
export const CHAT_MASCOT = "rive" as ChatMascot;
