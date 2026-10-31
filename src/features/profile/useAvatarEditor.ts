import { useRef, useState } from 'react';

import { haptics } from '@/services/haptics';
import { saveAvatar } from '@/services/session';

import type { AvatarAction } from './AvatarSheet';
import { CameraPermissionDenied, pickAvatar } from './pickAvatar';

type AvatarError = 'denied' | 'failed' | null;

/**
 * The photo sheet's flow. The picker opens only after the sheet has slid away: two native modals
 * opening at once is what makes iOS drop the second one.
 */
export function useAvatarEditor() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AvatarError>(null);
  const chosen = useRef<AvatarAction | null>(null);

  const select = (action: AvatarAction) => {
    chosen.current = action;
    setSheetOpen(false);
  };

  const onSheetClosed = async () => {
    const action = chosen.current;
    chosen.current = null;
    if (!action) return;

    setError(null);
    try {
      // One frame for the sheet's Modal to unmount before the picker presents its own.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const uri = action === 'remove' ? null : await pickAvatar(action);
      if (action !== 'remove' && uri === null) return;
      setBusy(true);
      await saveAvatar(uri);
      haptics.success();
    } catch (cause) {
      if (__DEV__) console.warn('Avatar update failed', cause);
      haptics.error();
      setError(cause instanceof CameraPermissionDenied ? 'denied' : 'failed');
    } finally {
      setBusy(false);
    }
  };

  return {
    sheetOpen,
    busy,
    error,
    open: () => {
      setError(null);
      setSheetOpen(true);
    },
    close: () => setSheetOpen(false),
    select,
    onSheetClosed,
  };
}
