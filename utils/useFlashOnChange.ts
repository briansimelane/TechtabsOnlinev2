import { useEffect, useRef, useState } from 'react';

export function useFlashOnChange(value: any) {
  const [flash, setFlash] = useState(false);
  const prevVal = useRef(value);

  useEffect(() => {
    if (JSON.stringify(prevVal.current) !== JSON.stringify(value)) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1500);
      prevVal.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return flash;
}
