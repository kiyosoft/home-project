import { useEffect, useState } from "react";

const QUERY = "(max-width: 639px)";

export function usePhoneViewport(): boolean {
  const [phone, setPhone] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setPhone(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return phone;
}
