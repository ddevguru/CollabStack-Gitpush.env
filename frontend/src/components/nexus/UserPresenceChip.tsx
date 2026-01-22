import { Circle } from 'lucide-react';

interface UserPresenceChipProps {
  name: string;
  avatar?: string;
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UserPresenceChip = ({
  name,
  avatar,
  isOnline,
  size = 'md',
}: UserPresenceChipProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className="relative inline-flex items-center">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={`${sizeClasses[size]} rounded-full`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-collab flex items-center justify-center text-white font-semibold`}
        >
          {name[0].toUpperCase()}
        </div>
      )}
      <Circle
        className={`absolute -bottom-0.5 -right-0.5 ${
          size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
        } ${isOnline ? 'text-emerald-500' : 'text-gray-500'}`}
        fill="currentColor"
      />
    </div>
  );
};

