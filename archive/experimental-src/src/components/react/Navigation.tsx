import React from 'react';

interface NavigationProps {
  onModalClick: (modalType: string) => void;
  isMobile?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ onModalClick, isMobile = false }) => {
  const navButtons = [
    { id: 'food', icon: '🍽️', label: 'Food' },
    { id: 'french', icon: '🇫🇷', label: 'French' },
    { id: 'analytics', icon: '📊', label: 'Analytics' },
    { id: 'transportation', icon: '🚗', label: 'Transportation' },
    { id: 'hood', icon: '🏠', label: 'Hood' },
    { id: 'exercise', icon: '💪', label: 'Exercise' },
    { id: 'tennis', icon: '🎾', label: 'Tennis' },
    { id: 'coffee', icon: '☕', label: 'Coffee' },
    { id: 'guitar', icon: '🎸', label: 'Guitar' },
    { id: 'history', icon: '📚', label: 'History' },
    { id: 'poetry', icon: '📝', label: 'Poetry' },
    { id: 'world-order', icon: '🌍', label: 'World Order' },
  ];

  return (
    <nav className={`navigation ${isMobile ? 'mobile-nav' : ''}`}>
      {navButtons.map((button) => (
        <button
          key={button.id}
          className="nav-btn"
          onClick={() => onModalClick(button.id)}
          title={button.label}
          data-modal={button.id}
        >
          {button.icon}
        </button>
      ))}
    </nav>
  );
};
