# Coding Standards for play-ai-project

## Build Commands
- `pnpm run dev`: Start development server
- `pnpm run build`: Build for production
- `pnpm run start`: Start production server
- `pnpm run lint`: Run ESLint

## Code Style
- TypeScript with strict typing
- Next.js App Router architecture
- React Query for state management
- Clean UI with Tailwind CSS and shadcn/ui

## Organization
- `/app`: Next.js pages and API routes
- `/lib`: Utilities, hooks, models, and types
- `/components`: Reusable UI components

## Conventions
- PascalCase for React components
- camelCase for functions and variables
- Descriptive interface names: `ChatProps`, `UpdateChatParams`
- Consistent error handling with try/catch

## Imports
- React imports first
- Next.js imports second
- Third-party libraries next
- Internal imports last with absolute paths: `@/lib/hooks/useChat`