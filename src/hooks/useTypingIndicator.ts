import { useCallback } from 'react';
import { TypingUser } from '../types/chat';

/**
 * Typing indicator hook
 * Note: Currently disabled as the existing database schema doesn't include a typing_indicators table.
 * To enable typing indicators, create a typing_indicators table in Supabase.
 */
export const useTypingIndicator = (_roomId: string) => {
  // Typing indicators are not available without the typing_indicators table
  const typingUsers: TypingUser[] = [];

  const setTyping = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_isTyping: boolean) => {
      // No-op: typing_indicators table not available
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
