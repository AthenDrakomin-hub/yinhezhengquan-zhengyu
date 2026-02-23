
import React from 'react';
import { ICONS, MOCK_EDUCATION } from '../constants';

const EducationCenter: React.FC = () => {
  return (
    <div className="space-y-4 animate-slide-up">
       <div className="glass-card p-4 border-[var(--color-border)] shadow-sm">
          <h3 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest mb-4">证券百科知识库</h3>
          <div className="grid grid-cols-1 gap-4">
             {MOCK_EDUCATION.map(topic => (
               <div key={topic.id} className="flex gap-4 bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] items-center group cursor-pointer hover:border-[#00D4AA]/30 transition-all">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                    <img src={topic.image} alt={topic.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                     <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#00D4AA]/10 text-[#00D4AA] uppercase tracking-tighter">{topic.category}</span>
                     <h4 className="text-xs font-black text-[var(--color-text-primary)]">{topic.title}</h4>
                     <p className="text-[9px] text-[var(--color-text-muted)] font-bold tracking-widest uppercase">{topic.duration}</p>
                  </div>
               </div>
             ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black uppercase tracking-[0.3em] hover:text-[#00D4AA] transition-all">
            查看更多精品课程
          </button>
       </div>
    </div>
  );
};

export default EducationCenter;
