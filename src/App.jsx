import { useState, useEffect } from "react";
import PasswordGate from "./components/PasswordGate.jsx";
import TelegramPopup from "./components/TelegramPopup.jsx";
import AppShell from "./components/AppShell.jsx";
import ExamScreen from "./components/ExamScreen.jsx";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [showTgPopup, setShowTgPopup] = useState(false);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    if (unlocked) {
      setShowTgPopup(true);

      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          setShowTgPopup(true);
        }
      };

      window.addEventListener("pagehide", () => setShowTgPopup(true));
      window.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        window.removeEventListener("pagehide", () => setShowTgPopup(true));
        window.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }
  }, [unlocked]);

  const handleStartExam = (test, lang) => {
    setExam({ test, lang });
  };

  const handleExitExam = () => {
    setExam(null);
  };

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <>
      {exam ? (
        <ExamScreen exam={exam} onExit={handleExitExam} />
      ) : (
        <AppShell onStartExam={handleStartExam} />
      )}
      {showTgPopup && (
        <TelegramPopup onClose={() => setShowTgPopup(false)} />
      )}
    </>
  );
}
