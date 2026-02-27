import React from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  modalId?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  modalId = 'storybook-modal' 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id={modalId} 
      className="modal" 
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <div className="modal-content">
        <div className="modal-title">{title}</div>
        <div className="modal-body">
          {children}
        </div>
        <button 
          className="modal-close" 
          onClick={onClose}
          title="Close modal"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
