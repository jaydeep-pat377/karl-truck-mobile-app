import { useCallback } from 'react';
import { TypingUser } from '../types/chat';

export const useTypingIndicator = (_roomId: string) => {

  const typingUsers: TypingUser[] = [];

  const setTyping = useCallback(

    (_isTyping: boolean) => {

    },
    []
  );

  return {
    typingUsers,
    setTyping,
    isTyping: false,
  };
};

export default useTypingIndicator;
