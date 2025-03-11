'use client';

import ChatList from './ChatList';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="min-h-screen"
    >
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="h-screen overflow-hidden">
        <ChatList />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={80} className="h-screen">
        <div className="h-full overflow-auto">
          {children}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 