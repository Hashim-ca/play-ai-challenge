'use client';

import ChatList from './ChatList';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex h-screen">
      <div className="w-80 h-full">
        <ChatList />
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
} 