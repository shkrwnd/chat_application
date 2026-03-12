import { cn } from '../../utils/cn';

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-pink-500',
];

function getColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ username, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        getColor(username),
        size === 'sm' && 'w-6 h-6 text-xs',
        size === 'md' && 'w-8 h-8 text-sm',
        size === 'lg' && 'w-10 h-10 text-base',
        className
      )}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
