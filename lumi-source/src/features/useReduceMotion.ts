import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettings } from '@/store/settings';

/** True if the phone's "reduce motion" setting or Lumi's own setting is on. */
export function useReduceMotion(): boolean {
  const appSetting = useSettings((s) => s.reduceMotion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setSystem(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return appSetting || system;
}
