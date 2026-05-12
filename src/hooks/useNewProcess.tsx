import { createContext, useContext, useState } from "react";

const NewProcessContext = createContext<{
  setIsNewProcessOpen: (open: boolean) => void;
} | undefined>(undefined);

export function NewProcessProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <NewProcessContext.Provider value={{ setIsNewProcessOpen: setIsOpen }}>
      {children}
      {/* The wizard is handled here or at the layout level */}
    </NewProcessContext.Provider>
  );
}

export function useNewProcess() {
  const context = useContext(NewProcessContext);
  if (!context) {
    throw new Error("useNewProcess must be used within a NewProcessProvider");
  }
  return context;
}
