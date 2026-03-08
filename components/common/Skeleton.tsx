import React from 'react';

export const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({ 
  width = '100%', 
  height = '1rem' 
}) => (
  <div 
    className="animate-pulse bg-slate-700 rounded" 
    style={{ width, height }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="glass-card p-6 rounded-2xl space-y-4">
    <SkeletonLine width="60%" height="1.5rem" />
    <SkeletonLine width="100%" />
    <SkeletonLine width="80%" />
    <SkeletonLine width="90%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="p-4 bg-slate-800 space-y-2">
      <SkeletonLine width="30%" height="1rem" />
    </div>
    <div className="divide-y divide-slate-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex gap-4">
          <SkeletonLine width="20%" />
          <SkeletonLine width="30%" />
          <SkeletonLine width="25%" />
          <SkeletonLine width="25%" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonLoginForm: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <SkeletonLine height="3.5rem" />
      <SkeletonLine height="3.5rem" />
    </div>
    <SkeletonLine height="4rem" />
  </div>
);
