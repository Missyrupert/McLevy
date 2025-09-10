
import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, maxWidth = 'max-w-2xl' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`bg-slate-800 rounded-lg shadow-2xl p-6 border border-purple-500 w-full ${maxWidth}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-serif-display text-purple-300">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;