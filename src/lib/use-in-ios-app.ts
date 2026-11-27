import { useEffect, useState } from "react";
import { runningInIOSApp } from "./ps5-remote-play";

/** Hydration-safe: true only after mount inside the installed iPhone app. */
export function useInIOSApp() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(runningInIOSApp()), []);
  return inApp;
}
