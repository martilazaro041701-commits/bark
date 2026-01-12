import { useState, useEffect } from 'react';
import { Plus, Search, Bell, Filter, ChevronLeft, ChevronRight, User, Car, GripVertical, MoreVertical, Clock } from 'lucide-react';
import BarkSidebar from '@/modules/bark/components/BarkSidebar';
import JobCard from '@/modules/bark/components/JobCard';
import NewCustomerModal from '@/modules/bark/components/NewCustomerModal';
import JobDetailModal from '@/modules/bark/components/JobDetailModal';


// --- MOCK DATA ---
const JOBS = [
  { id: 1, customerName: 'Martin Lazaro', jobType: 'Montero Right Panel Repair', phase: 'PHASE 1.1 LOA Processing', phaseTime: '4d', status: 'Active', startDate: 'January 2, 2026', insurance: 'Malayaan Insurance', priority: 'High', plate: 'YC-2982', car: 'Montero Sport' },
  { id: 2, customerName: 'Kristine Lazaro', jobType: 'Mirage G4 Bumper Replacement', phase: 'PHASE 2.3 Material Procurement', phaseTime: '9d', status: 'Waiting', startDate: 'December 28, 2025', insurance: 'Western Guaranty Corporation', priority: 'Normal', plate: 'ABC-123', car: 'Mirage G4' },
  { id: 3, customerName: 'Covy Lazaro', jobType: 'Covy Rear and Front Bumper Repair', phase: 'PHASE 3.1 Installation & Repairs', phaseTime: '22d', status: 'Active', startDate: 'December 15, 2025', insurance: 'Prudential Guarantee', priority: 'High', plate: 'XYZ-999', car: 'Bumper Repair' },
];

const BAYS = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, name: `Bay ${i + 1}` }));
const DAYS_TO_SHOW = 14;

const BarkDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      {/* Sidebar handles the view switching */}
      <BarkSidebar onNavigate={(view) => setCurrentView(view)} activeView={currentView} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP SEARCH/NOTIF BAR */}
        <div className="h-20 border-b border-slate-100 bg-white flex items-center justify-between px-10 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search customers, jobs..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/10 text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 bg-indigo-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-sm">
              ML
            </div>
          </div>
        </div>

        {/* CONDITIONALLY RENDER VIEWS */}
        {currentView === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto p-10">
            <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Tracker</h1>
                <p className="text-slate-500 font-medium mt-1">Monitor and manage all customer jobs in real-time</p>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                  <Filter size={16} /> Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-[#7C3AED] transition-all active:scale-95"
                >
                  <Plus size={20} /> New Job
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
               <StatCard label="Total Customers" value="6" trend="+ 12% this month" />
               <StatCard label="In Progress" value="5" trend="+ 3 new this week" />
               <StatCard label="Completed" value="1" trend="+ 2 this week" />
               <StatCard label="High Priority" value="3" trend="+ 1 added today" highlight />
            </div>

            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              Active Jobs <span className="text-sm font-bold text-slate-400">({JOBS.length})</span>
            </h2>

            <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
              {JOBS.map((job) => (
                <JobCard key={job.id} {...job} onClick={() => setSelectedJob(job)} />
              ))}
            </section>
          </div>
        ) : (
          <BaySchedulerView jobs={JOBS} />
        )}
      </main>

      {/* MODALS */}
      <NewCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <JobDetailModal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} job={selectedJob} />
    </div>
  );
};

/**
 * FIXED: BaySchedulerView - Prevented concurrent rendering errors
 */
const BaySchedulerView = ({ jobs }) => {
  // Use lazy initializer for state to prevent reset on every render
  const [waitingList, setWaitingList] = useState(() => jobs.filter(j => j.status === 'Waiting' || j.id === 1));
  const [assignments, setAssignments] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState(null);

  const dates = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { full: d, dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate() };
  });

  const handleDragStart = (e, item) => { 
    setDraggedItem(item); 
    e.dataTransfer.effectAllowed = "move"; 
  };

  const handleDrop = (e, bayId, dayIndex) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const newAssignment = { 
      ...draggedItem, 
      id: `asgn-${Date.now()}`, 
      bayId, 
      startDayIndex: dayIndex, 
      duration: 2, 
      color: 'bg-[#8B5CF6] text-white shadow-lg shadow-indigo-100' 
    };

    setAssignments(prev => [...prev, newAssignment]);
    setWaitingList(prev => prev.filter(i => i.id !== draggedItem.id));
    setDraggedItem(null);
  };

  const handleResizeStart = (e, id, duration) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeTarget({ id, originalDuration: duration, startX: e.clientX });
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isResizing || !resizeTarget) return;
      const diff = e.clientX - resizeTarget.startX;
      // 120 is the pixel width of one day column
      const newDuration = Math.max(1, resizeTarget.originalDuration + Math.round(diff / 120));
      setAssignments(prev => prev.map(a => a.id === resizeTarget.id ? { ...a, duration: newDuration } : a));
    };
    
    const handleUp = () => { 
      setIsResizing(false); 
      setResizeTarget(null); 
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => { 
      window.removeEventListener('mousemove', handleMove); 
      window.removeEventListener('mouseup', handleUp); 
    };
  }, [isResizing, resizeTarget]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#FFFBF5] animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-20 px-10 flex items-center justify-between border-b border-stone-200 bg-white/50">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Shop Bay Schedule</h2>
          <div className="flex gap-2">
            <button className="p-2 border rounded-xl bg-white hover:bg-stone-50"><ChevronLeft size={18}/></button>
            <button className="p-2 border rounded-xl bg-white hover:bg-stone-50"><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Header Dates */}
            <div className="flex sticky top-0 z-20 bg-[#FFFBF5] border-b border-stone-200">
              <div className="w-28 shrink-0 border-r bg-[#FFFBF5] h-14" />
              {dates.map((d, i) => (
                <div key={i} className="w-[120px] shrink-0 text-center py-3 border-r border-stone-100">
                  <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{d.dayName}</div>
                  <div className="text-lg font-black text-slate-800">{d.dayNum}</div>
                </div>
              ))}
            </div>
            {/* Bay Rows */}
            {BAYS.map(bay => (
              <div key={bay.id} className="flex h-24 border-b border-stone-100 relative group">
                <div className="w-28 shrink-0 sticky left-0 z-10 bg-white border-r flex items-center justify-center font-black text-[10px] text-slate-400 uppercase group-hover:bg-slate-50 transition-colors">{bay.name}</div>
                <div className="flex">
                  {dates.map((_, i) => (
                    <div 
                      key={i} 
                      onDragOver={(e)=>e.preventDefault()} 
                      onDrop={(e)=>handleDrop(e, bay.id, i)} 
                      className="w-[120px] shrink-0 border-r border-stone-50 h-full hover:bg-indigo-50/20" 
                    />
                  ))}
                  {assignments.filter(a => a.bayId === bay.id).map(asgn => (
                    <div 
                      key={asgn.id} 
                      className={`absolute top-2 bottom-2 rounded-2xl p-4 shadow-xl z-10 cursor-move border-l-[6px] border-white/30 flex flex-col justify-center ${asgn.color}`} 
                      style={{ left: `${asgn.startDayIndex * 120 + 116}px`, width: `${asgn.duration * 120 - 8}px` }}
                    >
                      <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">{asgn.plate}</p>
                      <p className="text-xs font-black truncate">{asgn.customerName}</p>
                      {/* Resize Handle */}
                      <div 
                        onMouseDown={(e) => handleResizeStart(e, asgn.id, asgn.duration)} 
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-black/10 rounded-r-2xl" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Waiting List Sidebar */}
      <div className="w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 shadow-2xl">
        <div className="p-8 border-b border-stone-100"><h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Vehicle Queue</h3></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/20">
          {waitingList.map(job => (
            <div key={job.id} draggable onDragStart={(e)=>handleDragStart(e, job)} className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-3"><GripVertical size={16} className="text-slate-200"/><span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">WAITING</span></div>
              <p className="text-sm font-black text-slate-900 leading-none">{job.customerName}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{job.car}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend, highlight = false }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-black text-slate-900">{value}</span>
      <span className={`text-[10px] font-bold ${highlight ? 'text-red-500' : 'text-emerald-500'}`}>{trend}</span>
    </div>
  </div>
);

export default BarkDashboard;