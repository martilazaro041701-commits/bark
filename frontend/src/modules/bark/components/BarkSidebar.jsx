import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TableProperties, 
  CalendarDays, 
  BarChart3, 
  Users, 
  Home,
  ChevronRight
} from 'lucide-react';

const BarkSidebar = ({ onNavigate, activeView }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Unified click handler to handle both URL routing and Dashboard state switching
  const handleNavigation = (id, path) => {
    if (onNavigate) {
      onNavigate(id); // Changes the internal dashboard view (e.g., to 'scheduling')
    }
    navigate(path); // Changes the URL
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-screen shrink-0">
      {/* BRANDING */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#8B5CF6] rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <LayoutDashboard size={22} fill="currentColor" />
        </div>
        <div>
          <span className="text-xl font-black tracking-tighter text-slate-900 block leading-none">Tracker</span>
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">by BARK</span>
        </div>
      </div>

      {/* NAVIGATION GROUP */}
      <nav className="flex-1 px-4 space-y-1.5">
        <div className="px-4 py-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Board View" 
            active={activeView === 'dashboard'} 
            onClick={() => handleNavigation('dashboard', '/bark')}
          />
          <SidebarItem 
            icon={<TableProperties size={20} />} 
            label="Table View" 
            active={location.pathname === '/bark/table'} 
            onClick={() => navigate('/bark/table')}
          />
          {/* THE UPDATED SCHEDULING BUTTON */}
          <SidebarItem 
            icon={<CalendarDays size={20} />} 
            label="Calendar Scheduling" 
            active={activeView === 'scheduling'} 
            onClick={() => handleNavigation('scheduling', '/bark')}
          />
        </div>

        <div className="px-4 py-4 border-t border-slate-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Insights</p>
          <SidebarItem 
            icon={<BarChart3 size={20} />} 
            label="Analytics" 
            active={location.pathname === '/bark/analytics'} 
            onClick={() => navigate('/bark/analytics')}
          />
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Customers" 
            active={location.pathname === '/bark/customers'} 
            onClick={() => navigate('/bark/customers')}
          />
        </div>
      </nav>

      {/* FOOTER: EXIT TO MODU */}
      <div className="p-6 mt-auto border-t border-slate-50">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group border border-slate-100"
        >
          <div className="flex items-center gap-3">
            <Home size={20} className="text-slate-400 group-hover:text-[#8B5CF6] transition-colors" />
            <span className="text-sm font-bold text-slate-600">Exit to MODU</span>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
      </div>
    </aside>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
      active 
        ? 'bg-[#8B5CF6] text-white shadow-md shadow-indigo-100' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-[#8B5CF6]'
    }`}
  >
    <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-[#8B5CF6]'} transition-colors`}>
      {icon}
    </div>
    <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

export default BarkSidebar;