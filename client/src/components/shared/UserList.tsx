import { Avatar } from '../ui/avatar';
import type { RoomMember } from '../../types';

interface UserListProps {
  users: RoomMember[];
  currentUserId: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Online — {users.length}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {users.length === 0 ? (
          <p className="text-xs text-gray-600 px-1">No one online</p>
        ) : (
          <div className="flex flex-col gap-1">
            {users.map((member) => (
              <div key={member.userId} className="flex items-center gap-2.5 px-1 py-1.5">
                <div className="relative flex-shrink-0">
                  <Avatar username={member.username} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900" />
                </div>
                <span
                  className={`text-sm truncate ${
                    member.userId === currentUserId ? 'text-white font-medium' : 'text-gray-300'
                  }`}
                >
                  {member.username}
                  {member.userId === currentUserId && (
                    <span className="text-xs text-gray-500 ml-1">(you)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
