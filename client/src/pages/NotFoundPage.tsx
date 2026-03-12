import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-800 mb-4">404</p>
        <p className="text-gray-400 font-medium mb-6">Page not found</p>
        <Link
          to="/"
          className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
        >
          ← Back to chat
        </Link>
      </div>
    </div>
  );
}
