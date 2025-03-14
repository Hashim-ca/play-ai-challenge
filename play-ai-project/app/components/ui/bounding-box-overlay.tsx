import React from 'react';

interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
  page: number;
}

interface Block {
  type: string;
  bbox: BoundingBox;
  content: string;
}

interface BoundingBoxOverlayProps {
  blocks: Block[];
  currentPage: number;
  rotation: number;
  onBlockClick?: (content: string) => void;
}

export function BoundingBoxOverlay({
  blocks,
  currentPage,
  rotation,
  onBlockClick,
}: BoundingBoxOverlayProps) {
  // Filter blocks for current page
  const pageBlocks = blocks.filter(block => block.bbox.page === currentPage);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {pageBlocks.map((block, index) => {
        // Calculate dimensions and add minimum sizes for better tappability
        const minWidthPx = 24;  // Minimum width in pixels
        const minHeightPx = 24; // Minimum height in pixels
        
        return (
          <div
            key={index}
            className="absolute border-2 border-blue-600/70 bg-blue-500/20 hover:bg-blue-500/40 active:bg-blue-500/60 cursor-pointer transition-colors rounded-sm"
            style={{
              top: block.bbox.top * 100 + "%",
              left: block.bbox.left * 100 + "%",
              width: block.bbox.width * 100 + "%",
              height: block.bbox.height * 100 + "%",
              minWidth: minWidthPx + 'px',
              minHeight: minHeightPx + 'px',
              // Add a small offset to make tiny elements easier to tap
              marginTop: -4 + 'px',
              marginLeft: -4 + 'px',
              padding: 4 + 'px',
              pointerEvents: onBlockClick ? 'auto' : 'none',
              touchAction: 'manipulation', // Improves touch response
              WebkitTapHighlightColor: 'rgba(0,0,0,0)', // Removes default mobile tap highlight
            }}
            title={block.content}
            onClick={() => onBlockClick?.(block.content)}
            aria-label={`Select text: ${block.content}`}
            role="button"
            tabIndex={0}
          />
        );
      })}
    </div>
  );
} 