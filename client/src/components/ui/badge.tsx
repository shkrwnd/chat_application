import { cn } from '../../utils/cn';

export function Badge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-indigo-600 rounded-full',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
