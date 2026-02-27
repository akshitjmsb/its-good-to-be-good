import React from 'react';
import { Task } from '../../types';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
  return (
    <div className="task-item">
      <input 
        type="checkbox" 
        checked={task.completed} 
        onChange={onToggle}
      />
      <label className={task.completed ? 'completed' : ''}>
        {task.text}
      </label>
      <button 
        className="delete-btn" 
        onClick={onDelete}
        title="Delete task"
      >
        &times;
      </button>
    </div>
  );
};
