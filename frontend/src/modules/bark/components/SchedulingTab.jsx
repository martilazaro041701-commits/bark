import React, { useState } from "react";
import { Clock, MoreHorizontal, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const INITIAL_EVENTS = [
  { id: 1, title: "Disassembly", time: "09:00", duration: 2, day: "Mon", type: "urgent", color: "bg-red-100 text-red-700 border-red-200" },
  { id: 2, title: "Paint Prep", time: "11:00", duration: 1.5, day: "Tue", type: "standard", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: 3, title: "Color Match", time: "14:00", duration: 1, day: "Wed", type: "review", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: 4, title: "Final Coat", time: "10:00", duration: 3, day: "Thu", type: "process", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { id: 5, title: "QC Inspection", time: "13:00", duration: 1, day: "Fri", type: "check", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

const DAYS = [
  { name: "Mon", date: "12" },
  { name: "Tue", date: "13" },
  { name: "Wed", date: "14" },
  { name: "Thu", date: "15" },
  { name: "Fri", date: "16" },
];

export const SchedulingTab = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [draggedEventId, setDraggedEventId] = useState(null);

  // Drag Handlers
  const handleDragStart = (e, id) => {
    setDraggedEventId(id);
    e.dataTransfer.effectAllowed = "move";
    // Transparent ghost image fix
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e, day, time) => {
    e.preventDefault();
    if (!draggedEventId) return;

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === draggedEventId ? { ...ev, day, time } : ev
      )
    );
    setDraggedEventId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFBF5] rounded-[2.5rem] p-8 overflow-hidden animate-in fade-in duration-500">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Team Schedule</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">May 12 - May 16, 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-stone-100">
            <button className="p-2 hover:bg-stone-50 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"><ChevronLeft size={18} /></button>
            <button className="p-2 hover:bg-stone-50 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"><ChevronRight size={18} /></button>
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            <Plus size={14} /> Add Event
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 overflow-y-auto relative bg-white/50 rounded-[2rem] border border-stone-100 shadow-inner p-6">
        
        {/* Days Header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] gap-4 mb-6 sticky top-0 z-10">
          <div className="pt-8 text-[10px] font-black text-stone-300 text-center uppercase tracking-widest">GMT+8</div>
          {DAYS.map((day) => {
             const isToday = day.name === "Thu"; // Mock "Today"
             return (
              <div key={day.name} className={`text-center py-4 rounded-2xl ${isToday ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-900 border border-stone-100"}`}>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{day.name}</div>
                <div className="text-xl font-black tracking-tight">{day.date}</div>
              </div>
             )
          })}
        </div>

        {/* Timeline Grid */}
        <div className="relative">
          {TIME_SLOTS.map((time) => (
            <div key={time} className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] gap-4 min-h-[100px] group">
              
              {/* Time Label */}
              <div className="text-right pr-4 text-[10px] font-bold text-stone-300 -mt-2 group-hover:text-stone-400 transition-colors">
                {time}
              </div>

              {/* Day Columns / Drop Zones */}
              {DAYS.map((day) => (
                <div
                  key={`${day.name}-${time}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.name, time)}
                  className="relative border-t border-dashed border-stone-200 hover:bg-stone-50/50 transition-colors rounded-xl"
                >
                  {/* Render Events */}
                  {events
                    .filter((ev) => ev.day === day.name && ev.time === time)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ev.id)}
                        className={`absolute top-2 left-2 right-2 z-10 p-4 rounded-2xl border cursor-move transition-all shadow-sm hover:shadow-md active:scale-95 active:rotate-1 ${ev.color} ${draggedEventId === ev.id ? 'opacity-50' : 'opacity-100'}`}
                        style={{ height: `${ev.duration * 90}px` }} // Dynamic height based on duration
                      >
                        <div className="flex justify-between items-start">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/40 text-[10px] font-bold mb-2">
                             {ev.title.charAt(0)}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></button>
                        </div>
                        <h4 className="text-sm font-black leading-tight mb-1">{ev.title}</h4>
                        <div className="flex items-center gap-1.5 opacity-80">
                          <Clock size={10} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{ev.time} - {parseInt(ev.time) + Math.floor(ev.duration)}:00</span>
                        </div>
                        
                        {/* Avatar Pile Mockup */}
                        <div className="absolute bottom-3 right-3 flex -space-x-1.5">
                           <div className="w-5 h-5 rounded-full bg-white border border-white flex items-center justify-center text-[6px] font-bold text-slate-400">AB</div>
                           {ev.type === 'process' && <div className="w-5 h-5 rounded-full bg-slate-900 border border-white text-white flex items-center justify-center text-[6px] font-bold">JD</div>}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}

          {/* Current Time Line (Mock) */}
          <div className="absolute top-[340px] left-[60px] right-0 h-[2px] bg-red-400 z-0 pointer-events-none opacity-40">
            <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
        </div>
      </div>
    </div>
  );
};