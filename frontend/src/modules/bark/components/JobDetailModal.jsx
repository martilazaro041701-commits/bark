import React, { useMemo, useState } from "react";
import {
  X,
  RefreshCw,
  Package,
  Clock,
  Building2,
  Plus,
  CheckCircle2,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Send,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// --- THEME CONSTANTS ---
const PHASE_THEME = {
  1: { solid: "bg-blue-600", border: "border-blue-200", text: "text-blue-600", dot: "bg-blue-600", shadow: "shadow-blue-200", dark: "bg-blue-700" },
  2: { solid: "bg-orange-500", border: "border-orange-200", text: "text-orange-600", dot: "bg-orange-500", shadow: "shadow-orange-200", dark: "bg-orange-600" },
  3: { solid: "bg-amber-700", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-700", shadow: "shadow-amber-200", dark: "bg-amber-800" },
  4: { solid: "bg-purple-600", border: "border-purple-200", text: "text-purple-600", dot: "bg-purple-600", shadow: "shadow-purple-200", dark: "bg-purple-700" },
  5: { solid: "bg-slate-900", border: "border-slate-200", text: "text-slate-900", dot: "bg-slate-900", shadow: "shadow-slate-200", dark: "bg-black" },
  6: { solid: "bg-red-600", border: "border-red-200", text: "text-red-600", dot: "bg-red-600", shadow: "shadow-red-200", dark: "bg-red-700" },
};

// --- HELPER COMPONENTS ---
function StatusChip({ status }) {
  const styles = {
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ongoing: "bg-yellow-50 text-yellow-800 border-yellow-200",
    pending: "bg-slate-50 text-slate-500 border-slate-200"
  };
  const dotStyles = {
    complete: "bg-emerald-500",
    ongoing: "bg-yellow-500",
    pending: "bg-slate-300"
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[status] || styles.pending}`}>
      <span className={`w-2 h-2 rounded-full ${dotStyles[status] || dotStyles.pending}`} />
      {status}
    </span>
  );
}

function PhaseMetaPill({ isDone, doneDays }) {
  if (isDone) return (
    <span className="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-white/15 border border-white/20 text-white">
      DONE: {doneDays}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-emerald-50/70 border border-emerald-200 text-emerald-800 animate-pulse">
      <span className="w-2 h-2 rounded-full bg-emerald-500" /> ACTIVE
    </span>
  );
}

function CurrentPill() {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
      <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "2.2s" }} /> Current
    </span>
  );
}

function SubtleTabButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="group inline-flex items-center gap-3 h-11 px-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-800 shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all">
      <span className="w-9 h-9 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.25em]">{label}</span>
    </button>
  );
}

// --- CALENDAR / SCHEDULING TAB COMPONENT ---
const INITIAL_EVENTS = [
  { id: 1, title: "Disassembly", time: "09:00", duration: 2, day: "Mon", type: "urgent", color: "bg-red-100 text-red-700 border-red-200" },
  { id: 2, title: "Paint Prep", time: "11:00", duration: 1.5, day: "Tue", type: "standard", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: 3, title: "Color Match", time: "14:00", duration: 1, day: "Wed", type: "review", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: 4, title: "Final Coat", time: "10:00", duration: 3, day: "Thu", type: "process", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { id: 5, title: "QC Inspection", time: "13:00", duration: 1, day: "Fri", type: "check", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const DAYS = [
  { name: "Mon", date: "12" },
  { name: "Tue", date: "13" },
  { name: "Wed", date: "14" },
  { name: "Thu", date: "15" },
  { name: "Fri", date: "16" },
];

const SchedulingTab = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [draggedEventId, setDraggedEventId] = useState(null);

  const handleDragStart = (e, id) => {
    setDraggedEventId(id);
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, day, time) => {
    e.preventDefault();
    if (!draggedEventId) return;
    setEvents((prev) => prev.map((ev) => (ev.id === draggedEventId ? { ...ev, day, time } : ev)));
    setDraggedEventId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFBF5] rounded-[2.5rem] p-8 overflow-hidden animate-in fade-in duration-500">
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
      <div className="flex-1 overflow-y-auto relative bg-white/50 rounded-[2rem] border border-stone-100 shadow-inner p-6">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] gap-4 mb-6 sticky top-0 z-10">
          <div className="pt-8 text-[10px] font-black text-stone-300 text-center uppercase tracking-widest">GMT+8</div>
          {DAYS.map((day) => {
             const isToday = day.name === "Thu"; 
             return (
              <div key={day.name} className={`text-center py-4 rounded-2xl ${isToday ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-900 border border-stone-100"}`}>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{day.name}</div>
                <div className="text-xl font-black tracking-tight">{day.date}</div>
              </div>
             )
          })}
        </div>
        <div className="relative">
          {TIME_SLOTS.map((time) => (
            <div key={time} className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] gap-4 min-h-[100px] group">
              <div className="text-right pr-4 text-[10px] font-bold text-stone-300 -mt-2 group-hover:text-stone-400 transition-colors">{time}</div>
              {DAYS.map((day) => (
                <div
                  key={`${day.name}-${time}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.name, time)}
                  className="relative border-t border-dashed border-stone-200 hover:bg-stone-50/50 transition-colors rounded-xl"
                >
                  {events.filter((ev) => ev.day === day.name && ev.time === time).map((ev) => (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ev.id)}
                      className={`absolute top-2 left-2 right-2 z-10 p-4 rounded-2xl border cursor-move transition-all shadow-sm hover:shadow-md active:scale-95 active:rotate-1 ${ev.color} ${draggedEventId === ev.id ? 'opacity-50' : 'opacity-100'}`}
                      style={{ height: `${ev.duration * 90}px` }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/40 text-[10px] font-bold mb-2">{ev.title.charAt(0)}</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></button>
                      </div>
                      <h4 className="text-sm font-black leading-tight mb-1">{ev.title}</h4>
                      <div className="flex items-center gap-1.5 opacity-80"><Clock size={10} /><span className="text-[9px] font-bold uppercase tracking-wider">{ev.time} - {parseInt(ev.time) + Math.floor(ev.duration)}:00</span></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          <div className="absolute top-[340px] left-[60px] right-0 h-[2px] bg-red-400 z-0 pointer-events-none opacity-40"><div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-red-400" /></div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN MODAL COMPONENT ---
const JobDetailModal = ({ isOpen, onClose, job }) => {
  const [activeTab, setActiveTab] = useState("Approval Process");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-7xl h-[90vh] flex flex-col animate-in zoom-in duration-300">
        <div className="w-72 h-12 bg-white rounded-t-[2.5rem] px-10 flex items-center shadow-[-10px_-10px_30px_rgba(0,0,0,0.05)]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Bark Tracker</span>
        </div>

        <div className="bg-white flex-1 rounded-[3.5rem] rounded-tl-none shadow-2xl flex flex-col overflow-hidden border border-white">
          {/* Header */}
          <div className="px-12 py-10 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-200">
                <Package size={38} />
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{job.customerName}</h2>
                <div className="mt-1 flex flex-col">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{job.jobType}</p>
                  <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.2em] mt-0.5">Plate Number: YC-2982</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <div className="text-right">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Total Days Active</p>
                <div className="flex items-center justify-end gap-2 text-slate-900 font-black">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-xl">{job.phaseTime}</span>
                </div>
              </div>
              <button className="group relative flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                Update Status
              </button>
              <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all text-slate-400">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-12 flex gap-4 shrink-0">
            {["Overview", "Approval Process", "Parts Order", "Scheduling", "Repair", "Billing"].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-4 rounded-t-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>{t}</button>
            ))}
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-hidden flex bg-white border-t border-slate-100">
            {/* Sidebar Adjusted to 50% width as requested (w-1/2) */}
            <div className="w-1/2 border-r border-slate-50 p-10 overflow-y-auto overflow-x-visible bg-slate-50/20">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Process Dynamics</h4>
              <ProcessTree onAddNote={() => setIsAddingNote(true)} currentPhaseNo={2} currentStepId="2.1" />
            </div>

            <div className="flex-1 p-12 overflow-y-auto relative">
              {isAddingNote && (
                <div className="absolute inset-x-12 top-12 z-20 bg-yellow-50 border-2 border-yellow-200 p-8 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase text-yellow-700 tracking-widest">New Timeline Note</span>
                    <button onClick={() => setIsAddingNote(false)}><X size={18} className="text-yellow-700" /></button>
                  </div>
                  <textarea autoFocus value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Type technical notes or repair updates here..." className="w-full h-32 bg-transparent border-none focus:ring-0 font-bold text-black placeholder:text-black/40 resize-none text-lg" />
                  <div className="flex justify-end mt-4">
                    <button className="flex items-center gap-2 px-8 py-3 bg-yellow-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-yellow-200" onClick={() => setIsAddingNote(false)}>
                      <Send size={14} /> Post Note
                    </button>
                  </div>
                </div>
              )}
              
              {/* Content Area with Scheduling Tab Integration */}
              {activeTab === "Scheduling" ? (
                <SchedulingTab />
              ) : (
                <div className="max-w-3xl animate-in slide-in-from-right-4">
                  <h3 className="text-4xl font-black text-slate-900 mb-6 uppercase tracking-tight">{activeTab}</h3>
                  <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
                    <p className="text-slate-500 font-medium leading-relaxed text-lg">Detailed documentation for {activeTab}. Use the left timeline to track micro-progress.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PROCESS COMPONENTS ---
const ProcessTree = ({ onAddNote, currentPhaseNo, currentStepId }) => {
  const phases = useMemo(() => [
    {
      phaseNo: 1, title: "Approval Process", status: "complete", doneDays: "4D",
      steps: [
        { id: "1.1", title: "Estimate Done", status: "complete", started: "Jan 01, 2026", completed: "Jan 01, 2026", note: "Estimate confirmed by insurer." },
        { id: "1.2", title: "LOA Processing", status: "complete", started: "Jan 02, 2026", completed: "Jan 04, 2026", note: "Customer requested express body paint." },
        { id: "1.3", title: "LOA Revising", status: "complete", started: "Jan 04, 2026", completed: "Jan 05, 2026" },
        { id: "1.4", title: "LOA Approved", status: "complete", started: "Jan 05, 2026", completed: "Jan 05, 2026" },
        { id: "1.5", title: "Final Confirmation", status: "complete", started: "Jan 06, 2026", completed: "Jan 06, 2026" },
      ],
    },
    {
      phaseNo: 2, title: "Material Procurement", status: "ongoing",
      steps: [
        { id: "2.1", title: "Parts Inventory Audit", status: "ongoing", started: "Jan 08, 2026" },
        { id: "2.2", title: "Parts Ordered", status: "pending" },
        { id: "2.3", title: "Partial Parts Received", status: "pending" },
        { id: "2.4", title: "Parts Complete", status: "pending" },
      ],
    },
    {
      phaseNo: 3, title: "Scheduling", status: "pending",
      steps: [
        { id: "3.1", title: "Waiting for Scheduling", status: "pending" },
        { id: "3.2", title: "Scheduled for Repair", status: "pending" },
      ],
    },
  ], []);

  const [expanded, setExpanded] = useState(() => {
    const init = {};
    phases.forEach((p) => (init[p.phaseNo] = p.phaseNo === currentPhaseNo));
    return init;
  });

  const togglePhase = (phaseNo) => setExpanded((p) => ({ ...p, [phaseNo]: !p[phaseNo] }));
  const visiblePhases = phases.filter((p) => p.phaseNo <= currentPhaseNo);

  return (
    <div className="relative pl-16">
      <div className="absolute left-[24px] top-0 bottom-0 w-[2px] bg-slate-100" />
      <div className="space-y-16">
        {visiblePhases.map((phase) => {
          const theme = PHASE_THEME[phase.phaseNo] || PHASE_THEME[1];
          const isCurrentPhase = phase.phaseNo === currentPhaseNo;

          return (
            <div key={phase.phaseNo} className="relative">
              <div className={`absolute left-[16px] top-9 w-4 h-4 rounded-full border-4 border-white shadow-lg z-20 ${isCurrentPhase ? theme.dot : "bg-slate-200"}`} />
              
              <div className="ml-16 flex items-start gap-4">
                <PhaseCard phase={phase} theme={theme} isCurrent={isCurrentPhase} />
                <div className="pt-3 space-y-3">
                  <SubtleTabButton icon={<StickyNote size={16} strokeWidth={2.5} />} label="Add Note" onClick={onAddNote} />
                  <SubtleTabButton icon={expanded[phase.phaseNo] ? <ChevronUp size={16} /> : <ChevronDown size={16} />} label={expanded[phase.phaseNo] ? "Hide" : "View"} onClick={() => togglePhase(phase.phaseNo)} />
                </div>
              </div>

              <div className="ml-16 mt-7 space-y-4">
                {phase.steps.map((s) => {
                  const isCurrentStep = isCurrentPhase && s.id === currentStepId;
                  const isOngoingStep = s.status === "ongoing";
                  const shouldShow = expanded[phase.phaseNo] || isOngoingStep || isCurrentStep;

                  if (!shouldShow) return null;

                  return (
                    <div key={s.id} className="flex items-start gap-4 animate-in fade-in slide-in-from-left-2">
                      <div className="relative w-10 shrink-0">
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200" />
                      </div>
                      
                      <SubPhaseCard phaseNo={phase.phaseNo} step={s} isCurrent={isCurrentStep} />
                      
                      {s.note && (
                        <div className="group relative shrink-0 z-10 self-center">
                          <div className="w-36 group-hover:w-80 group-hover:absolute group-hover:right-0 group-hover:top-1/2 group-hover:-translate-y-1/2 bg-yellow-50 border border-yellow-200 p-4 rounded-[1.8rem] shadow-sm transition-all duration-300 ease-in-out border-l-4 border-l-yellow-400 cursor-help overflow-hidden group-hover:shadow-2xl group-hover:z-[60] bg-white">
                            <div className="flex items-center gap-1.5 mb-1 text-yellow-700 shrink-0">
                              <StickyNote size={12} strokeWidth={3} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Note</span>
                            </div>
                            <p className="text-[11px] font-bold text-black leading-tight italic truncate group-hover:whitespace-normal group-hover:overflow-visible">
                              "{s.note}"
                            </p>
                          </div>
                          <div className="w-36 h-12 invisible" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isCurrentPhase && (
                <div className="ml-16 mt-8">
                  <button className="group inline-flex items-center gap-3 h-11 px-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-800 shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all">
                    <span className="w-9 h-9 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700"><Plus size={18} /></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">Add Next Phase</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PhaseCard = ({ phase, theme, isCurrent }) => {
  const isDone = phase.status === "complete";
  const isOngoing = phase.status === "ongoing";
  const isPhase1 = phase.phaseNo === 1;
  const base = isPhase1 ? `${theme.solid} text-white shadow-2xl ${theme.shadow}` : `bg-white border-2 ${theme.border} text-slate-900 shadow-lg`;
  const currentTint = isCurrent ? (isPhase1 ? `${theme.dark}` : "bg-slate-50/40") : "";

  return (
    <div className={`relative w-full max-w-[360px] rounded-[2.8rem] px-8 py-7 ${base} ${currentTint}`}>
      <div className="absolute right-6 top-6"><PhaseMetaPill isDone={isDone} doneDays={phase.doneDays} /></div>
      <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${isPhase1 ? "text-white/70" : theme.text}`}>PHASE {phase.phaseNo}</span>
      <p className={`mt-3 text-[28px] leading-[1.05] font-black uppercase tracking-tight ${isPhase1 ? "text-white" : "text-slate-900"}`}>{phase.title}</p>
      <div className="mt-7 flex items-center justify-between gap-6">
        <StatusChip status={isDone ? "complete" : isOngoing ? "ongoing" : "pending"} />
        {isCurrent ? <CurrentPill /> : <div className="w-[110px]" />}
      </div>
    </div>
  );
};

const SubPhaseCard = ({ phaseNo, step, isCurrent }) => {
  const isDone = step.status === "complete";
  const isOngoing = step.status === "ongoing";

  return (
    <div className={`relative flex-1 bg-white rounded-[2rem] border shadow-sm px-6 py-5 ${isCurrent ? "border-yellow-200 shadow-yellow-100 bg-yellow-50/25" : "border-slate-100"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isOngoing ? "bg-yellow-50 text-yellow-800 border-yellow-200" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
            {isDone ? <CheckCircle2 size={18} /> : isOngoing ? <RefreshCw size={16} className="animate-spin" style={{ animationDuration: "2.2s" }} /> : <span className="text-[11px] font-black">{step.id.split(".")[1]}</span>}
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-900">PHASE {phaseNo}.{step.id.split(".")[1]} {step.title}</p>
            <div className="mt-3 flex gap-8">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Started</p>
                <p className="text-[12px] font-bold text-slate-800">{step.started ?? "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Completed</p>
                {isOngoing ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-yellow-600 uppercase italic animate-pulse">Ongoing</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative h-2 w-2 rounded-full bg-yellow-500"></span>
                    </span>
                  </div>
                ) : (
                  <p className={`text-[12px] font-bold ${isDone ? "text-emerald-700" : "text-slate-400"}`}>{step.completed ?? "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <StatusChip status={step.status} />
      </div>
      {isCurrent && (
        <div className="mt-4 pt-4 border-t border-yellow-100 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-800">Current stage</span>
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default JobDetailModal;