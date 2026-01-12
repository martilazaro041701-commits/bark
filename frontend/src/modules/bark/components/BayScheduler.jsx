import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, Calendar as CalIcon, CheckCircle2 } from 'lucide-react';

const BAYS = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, name: `Bay ${i + 1}` }));
const DAYS_TO_SHOW = 14;

const BayScheduler = ({ jobs = [] }) => {
  const [waitingList, setWaitingList] = useState(() => jobs.filter(j => j.status === 'Waiting'));
  const [assignments, setAssignments] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  // Month Display
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Date Generator
  const dates = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate() };
  });

  const handleDragStart = (e, item, source) => {
    setDraggedItem(item);
    setDragSource(source);
    e.dataTransfer.setData('text/plain', ''); // Necessary for some browsers
  };

  const handleDrop = (e, bayId, dayIndex) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (dragSource === 'grid') {
      // MOVE EXISTING
      setAssignments(prev => prev.map(a => 
        a.gridId === draggedItem.gridId ? { ...a, bayId, startDayIndex: dayIndex } : a
      ));
    } else {
      // ADD NEW
      const newAsgn = { 
        ...draggedItem, 
        gridId: `grid-${Math.random()}`, 
        bayId, 
        startDayIndex: dayIndex, 
        duration: 2, 
        internalStatus: 'Ongoing' 
      };
      setAssignments(prev => [...prev, newAsgn]);
      setWaitingList(prev => prev.filter(i => i.id !== draggedItem.id));
    }
    setDraggedItem(null);
  };

  const toggleStatus = (gridId) => {
    setAssignments(prev => prev.map(a => 
      a.gridId === gridId ? { ...a, internalStatus: a.internalStatus === 'Done' ? 'Ongoing' : 'Done' } : a
    ));
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#FFFBF5]">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="h-20 px-10 flex items-center justify-between border-b border-stone-200 bg-white">
          <div>
            <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-widest">
              <CalIcon size={14} /> {currentMonth}
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Shop Schedule</h2>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* DATE ROW */}
            <div className="flex sticky top-0 z-20 bg-white border-b border-stone-200">
              <div className="w-28 shrink-0 border-r h-14" />
              {dates.map((d, i) => (
                <div key={i} className="w-[140px] shrink-0 text-center py-3 border-r border-stone-100">
                  <div className="text-[9px] font-black text-stone-400 uppercase">{d.dayName}</div>
                  <div className="text-lg font-black text-slate-800">{d.dayNum}</div>
                </div>
              ))}
            </div>

            {/* BAYS */}
            {BAYS.map(bay => (
              <div key={bay.id} className="flex h-32 border-b border-stone-100 relative group">
                <div className="w-28 shrink-0 sticky left-0 z-10 bg-white border-r border-stone-200 flex items-center justify-center font-black text-[10px] text-slate-400 uppercase group-hover:bg-slate-50 transition-colors">
                  {bay.name}
                </div>
                <div className="flex">
                  {dates.map((_, i) => (
                    <div 
                      key={i} 
                      onDragOver={(e)=>e.preventDefault()} 
                      onDrop={(e)=>handleDrop(e, bay.id, i)} 
                      className="w-[140px] shrink-0 border-r border-stone-50 h-full hover:bg-indigo-50/20" 
                    />
                  ))}
                  
                  {assignments.filter(a => a.bayId === bay.id).map(asgn => (
                    <div 
                      key={asgn.gridId} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, asgn, 'grid')}
                      className={`absolute top-2 bottom-2 rounded-2xl p-4 z-10 cursor-move border-l-[6px] shadow-lg flex flex-col justify-between transition-all ${
                        asgn.internalStatus === 'Done' 
                          ? 'bg-slate-200 border-slate-500 text-slate-600' 
                          : 'bg-emerald-500 border-white text-white'
                      }`} 
                      style={{ left: `${asgn.startDayIndex * 140 + 118}px`, width: `${asgn.duration * 140 - 10}px` }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black uppercase opacity-70">{asgn.plate}</span>
                        <button onClick={() => toggleStatus(asgn.gridId)}>
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                      <div>
                        <p className="text-xs font-black truncate">{asgn.customerName}</p>
                        <p className="text-[10px] font-bold opacity-80">{asgn.car}</p>
                        <p className="text-[8px] font-black uppercase tracking-tighter mt-1 border-t border-white/20 pt-1">{asgn.jobType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* YELLOW WAITING LIST */}
      <div className="w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 shadow-xl">
        <div className="p-8 border-b border-stone-100 bg-stone-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Vehicle Queue
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/10">
          {waitingList.map(job => (
            <div 
              key={job.id} 
              draggable 
              onDragStart={(e) => handleDragStart(e, job, 'queue')} 
              className="bg-amber-50 p-5 rounded-[2rem] border border-amber-200 shadow-sm cursor-grab hover:shadow-md transition-all"
            >
              <div className="flex justify-between mb-2">
                <GripVertical size={16} className="text-amber-300" />
                <span className="text-[8px] font-black text-amber-700 bg-amber-200/50 px-2 py-1 rounded">WAITING</span>
              </div>
              <p className="text-sm font-black text-slate-900">{job.customerName}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{job.car} • {job.plate}</p>
              <p className="text-[9px] font-bold text-amber-800 mt-2 border-t border-amber-100 pt-2 uppercase">{job.jobType}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BayScheduler;