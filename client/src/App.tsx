import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './hooks/useAuth';
import { router } from './routes';

function SocketWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return <SocketProvider token={token}>{children}</SocketProvider>;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketWrapper>
        <RouterProvider router={router} />
      </SocketWrapper>
    </AuthProvider>
  );
}
