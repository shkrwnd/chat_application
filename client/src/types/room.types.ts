export interface Room {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: number;
}

export interface RoomMember {
  userId: string;
  username: string;
}
