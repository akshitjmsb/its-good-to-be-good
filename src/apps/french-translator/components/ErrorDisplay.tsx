import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2 text-[#6b7280]">
      <AlertCircle size={14} />
      <p className="text-xs tracking-[0.04em]">{message}</p>
    </div>
  );
}
