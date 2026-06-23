import { createContext, useContext, useState, type ReactNode } from "react";
import type { Persona } from "./safety-data";

type Ctx = {
  persona: Persona;
  setPersona: (p: Persona) => void;
};

const PersonaContext = createContext<Ctx | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>("inspector");
  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be inside PersonaProvider");
  return ctx;
}
