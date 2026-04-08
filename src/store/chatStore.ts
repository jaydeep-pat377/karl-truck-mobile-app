import { create } from 'zustand';
import { ChatRoom, Message, TypingUser } from '../types/chat';

export interface ChatToastData {
  orderId: number;
  orderCode: string;
  senderName: string;
  messagePreview: string;
  timestamp: number;
}

interface ChatState {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingUser[]>;
  isConnected: boolean;
  unreadCounts: Record<string, number>;
  latestToast: ChatToastData | null;
}

interface ChatActions {
  setRooms: (rooms: ChatRoom[]) => void;
  addRoom: (room: ChatRoom) => void;
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  removeRoom: (roomId: string) => void;
  setCurrentRoom: (roomId: string | null) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  setTypingUsers: (roomId: string, users: TypingUser[]) => void;
  addTypingUser: (roomId: string, user: TypingUser) => void;
  removeTypingUser: (roomId: string, userId: string) => void;
  setConnected: (connected: boolean) => void;
  updateUnreadCount: (roomId: string, count: number) => void;
  incrementUnreadCount: (roomId: string) => void;
  markRoomAsRead: (roomId: string) => void;
  setLatestToast: (toast: ChatToastData | null) => void;
  clearChat: () => void;
  getTotalUnreadCount: () => number;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  messages: {},
  typingUsers: {},
  isConnected: false,
  unreadCounts: {},
  latestToast: null,

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [room, ...state.rooms.filter((r) => r.id !== room.id)],
    })),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, ...updates } : room
      ),
    })),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((room) => room.id !== roomId),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== roomId)
      ),
    })),

  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  addMessage: (roomId, message) =>
    set((state) => {
      const existingMessages = state.messages[roomId] || [];
      const messageExists = existingMessages.some((m) => m.id === message.id);

      if (messageExists) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [roomId]: [...existingMessages, message],
        },
      };
    }),

  updateMessage: (roomId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  setTypingUsers: (roomId, users) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [roomId]: users },
    })),

  addTypingUser: (roomId, user) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [roomId]: [
          ...(state.typingUsers[roomId] || []).filter(
            (u) => u.user_id !== user.user_id
          ),
          user,
        ],
      },
    })),

  removeTypingUser: (roomId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [roomId]: (state.typingUsers[roomId] || []).filter(
          (u) => u.user_id !== userId
        ),
      },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  updateUnreadCount: (roomId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: count },
    })),

  incrementUnreadCount: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] || 0) + 1,
      },
    })),

  markRoomAsRead: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),

  setLatestToast: (toast) => set({ latestToast: toast }),

  clearChat: () =>
    set({
      rooms: [],
      currentRoomId: null,
      messages: {},
      typingUsers: {},
      unreadCounts: {},
      latestToast: null,
    }),

  getTotalUnreadCount: () => {
    const state = get();
    return Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0);
  },
}));

export default useChatStore;
