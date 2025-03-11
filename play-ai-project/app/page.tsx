import ChatLayout from './components/ChatLayout';
import { Chat } from './components/Chat';

export default function Home() {
  return (
    <ChatLayout>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="w-full max-w-5xl">
          <h1 className="text-4xl font-bold text-center mb-8">Chat Application</h1>
          <Chat />
        </div>
      </main>
    </ChatLayout>
  );
}
