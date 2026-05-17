import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import AiChatWidget from "@/components/AiChatWidget";
import CommandPalette from "@/components/CommandPalette";
import OfflineBanner from "@/components/OfflineBanner";
import AppProviders from "@/AppProviders";
import AppRoutes from "@/routes";

const App = () => {
  const [splashDone, setSplashDone] = useState(() => {
    if (sessionStorage.getItem("splash-shown")) return true;
    sessionStorage.setItem("splash-shown", "1");
    return false;
  });

  return (
    <AppProviders>
      {!splashDone && <SplashScreen onFinished={() => setSplashDone(true)} />}
      <AppRoutes />
      <AiChatWidget />
      <CommandPalette />
      <OfflineBanner />
    </AppProviders>
  );
};

export default App;
