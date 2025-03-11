# Chat Interface Project

This is a simple chat interface built with Next.js, React, and MongoDB. It allows users to create, view, edit, and delete chats.

## Features

- Create new chats
- View existing chats
- Edit chat titles
- Delete chats
- MongoDB integration for data persistence

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create a `.env` file in the root directory with your MongoDB connection string:

```
MONGODB_URI="your-mongodb-connection-string"
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app` - Next.js app directory
  - `/api` - API routes for chat operations
  - `/chat` - Chat pages and components
  - `/components` - Reusable UI components
- `/lib` - Utility functions and services
  - `/models` - MongoDB models
  - `/types` - TypeScript type definitions

## API Routes

- `GET /api/chat` - Get all chats
- `POST /api/chat` - Create a new chat
- `GET /api/chat/[id]` - Get a single chat by ID
- `PUT /api/chat/[id]` - Update a chat
- `DELETE /api/chat/[id]` - Delete a chat

## MongoDB Schema

Each chat has the following fields:

- `id` - Unique identifier
- `title` - Chat title
- `pdfStorageUrl` - URL to stored PDF (optional)
- `pdfFileName` - Name of the PDF file (optional)
- `parsedContent` - Parsed content from PDF (optional)
- `audioInfo` - Audio information (optional)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## License

This project is licensed under the MIT License.
