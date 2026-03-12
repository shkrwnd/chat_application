import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { createRoom } from '../../services/roomService';
import type { Room } from '../../types';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (room: Room) => void;
}

export function CreateRoomModal({ open, onClose, onCreated }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setName('');
    setDescription('');
    setError('');
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const room = await createRoom(name.trim(), description.trim());
      onCreated(room);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create a room">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Room name"
          placeholder="e.g. general"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />
        <Input
          label="Description (optional)"
          placeholder="What's this room about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Create room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
