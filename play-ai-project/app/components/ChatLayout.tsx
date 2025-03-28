"use client"

import type React from "react"

import { useState, useEffect } from "react"
import ChatList from "./ChatList"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Menu, X, MessageSquare } from "lucide-react"
import { useMediaQuery } from "../hooks/use-media-query"
import { cn } from "@/lib/utils"

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isSmallScreen = useMediaQuery("(max-width: 768px)")

  // Update isMobile state based on screen size
  useEffect(() => {
    setIsMobile(isSmallScreen)
    setIsCollapsed(isSmallScreen)
  }, [isSmallScreen])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Mobile header with toggle button */}
      {isMobile && (
        <div className="h-14 border-b flex items-center px-4 sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">PDF Chat</h1>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full flex flex-col">
            <div
              className={cn(
                "fixed inset-y-0 left-0 z-20 w-[280px] transform transition-transform duration-200 ease-in-out",
                "bg-background border-r h-full",
                isCollapsed ? "-translate-x-full" : "translate-x-0",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-background",
                  !isCollapsed && "pt-14", // Add padding top when sidebar is open to account for header
                )}
              >
                <ChatList onSelectChat={() => setIsCollapsed(true)} />
              </div>
            </div>

            {/* Overlay when sidebar is open on mobile */}
            {!isCollapsed && (
              <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-10"
                onClick={() => setIsCollapsed(true)}
              />
            )}

            <div className="flex-1 h-full overflow-hidden">{children}</div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40} className="h-full overflow-hidden border-r">
              <ChatList />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75} className="h-full">
              <div className="h-full overflow-hidden">{children}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}

