import { createContext, type ReactNode, useContext, useState } from "react";

interface ChatContextType {
  selectedThreadId: string | undefined;
  setSelectedThreadId: (id: string | undefined) => void;
  isNewThread: boolean;
  setIsNewThread: (isNew: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string>();
  const [isNewThread, setIsNewThread] = useState(false);

  return (
    <ChatContext.Provider
      value={{
        selectedThreadId,
        setSelectedThreadId,
        isNewThread,
        setIsNewThread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatState must be used within a ChatProvider");
  }
  return context;
}
