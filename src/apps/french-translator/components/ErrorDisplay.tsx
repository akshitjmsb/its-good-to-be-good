import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-red-500 justify-center">
      <AlertCircle size={14} />
      <p className="text-[10px] font-black uppercase">{message}</p>
    </div>
  );
}
