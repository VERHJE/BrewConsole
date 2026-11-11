import { useEffect, useState } from 'preact/hooks';

/** Volgt een mediaquery (bijvoorbeeld '(min-width: 1100px)'). Zonder matchMedia (oude omgeving) geldt `false`. */
export function useMedia(query: string): boolean {
  const get = (): boolean => (typeof matchMedia === 'function' ? matchMedia(query).matches : false);
  const [on, setOn] = useState(get);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const h = (): void => setOn(mq.matches);
    h(); mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return on;
}
