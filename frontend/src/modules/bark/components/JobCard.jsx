import React from 'react';
import { Clock, Package, ChevronRight } from 'lucide-react';

const JobCard = ({ customerName, jobType, phase, phaseTime, priority, onClick }) => {
  const isHighPriority = priority === "High";

  return (
    <div onClick={onClick} className="group cursor-pointer transition-transform hover:-translate-y-1 active:scale-95">
      {/* Folder Tab */}
      <div className={`w-32 h-8 ${isHighPriority ? 'bg-red-500' : 'bg-slate-300'} rounded-t-2xl ml-4 flex items-center justify-center`}>
        <span className="text-[10px] font-black text-white uppercase tracking-widest">
          {isHighPriority ? 'Urgent' : 'File'}
        </span>
      </div>
      
      {/* Folder Body */}
      <div className="bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 min-h-[200px] flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-black text-slate-900 leading-tight">{customerName}</h3>
            {isHighPriority && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
          </div>
          <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-tight">{jobType}</p>
        </div>

        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <Package size={14} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-bold text-blue-400 uppercase leading-none">Current Phase</p>
            <p className="text-blue-900 font-black text-[11px] truncate">{phase}</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase">{phaseTime} active</span>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default JobCard;