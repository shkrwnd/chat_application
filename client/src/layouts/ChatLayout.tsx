import type { ReactNode } from 'react';

interface ChatLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  userList: ReactNode;
}

export function ChatLayout({ sidebar, main, userList }: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        {main}
      </main>
      <aside className="w-56 flex-shrink-0 border-l border-gray-800 flex flex-col bg-gray-900">
        {userList}
      </aside>
    </div>
  );
}
