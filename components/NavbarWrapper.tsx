"use client";

import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { createContext, useContext, useState, ReactNode } from "react";

interface TimerContextType {
  isTimerRunning: boolean;
  setIsTimerRunning: (isRunning: boolean) => void;
}

const TimerContext = createContext<TimerContextType>({
  isTimerRunning: false,
  setIsTimerRunning: () => {},
});

export function useTimerContext() {
  return useContext(TimerContext);
}

export function NavbarWrapper({ children }: { children: ReactNode }) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  return (
    <TimerContext.Provider value={{ isTimerRunning, setIsTimerRunning }}>
      <Navbar isTimerRunning={isTimerRunning} />
      {children}
      <MobileBottomNav />
    </TimerContext.Provider>
  );
}
