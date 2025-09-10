
import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="absolute inset-0 bg-slate-900 bg-opacity-80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-400"></div>
      <p className="text-white text-xl mt-4 font-serif-display">{message}</p>
    </div>
  );
};

export default Loader;
