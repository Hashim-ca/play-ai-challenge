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
        return (
          <div
            key={index}
            className="absolute border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer transition-colors"
            style={{
              top: block.bbox.top * 100 + "%",
              left: block.bbox.left * 100 + "%",
              width: block.bbox.width * 100 + "%",
              height: block.bbox.height * 100 + "%",
              pointerEvents: onBlockClick ? 'auto' : 'none',
            }}
            title={block.content}
            onClick={() => onBlockClick?.(block.content)}
          />
        );
      })}
    </div>
  );
} 