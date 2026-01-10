import { useMemo, useState } from 'react';
import { CheckCircle2, GripVertical } from 'lucide-react';

const BAY_COUNT = 14;
const BAYS = Array.from({ length: BAY_COUNT }, (_, i) => ({ id: i + 1, name: `Bay ${i + 1}` }));

const BayScheduler = ({ jobs = [] }) => {
  const [waitingList, setWaitingList] = useState(() =>
    jobs.map((job) => ({
      ...job,
      status: job.status === 'Completed' ? 'completed' : 'waiting',
    }))
  );
  const [assignments, setAssignments] = useState(() => ({}));

  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    []
  );

  const startDrag = (event, payload) => {
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnBay = (event, bayId) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/json');
    if (!payload) return;

    const { itemId, source, fromBayId } = JSON.parse(payload);

    if (source === 'waiting') {
      setWaitingList((prev) => {
        const item = prev.find((job) => job.id === itemId);
        if (item) {
          setAssignments((assignmentsPrev) => ({
            ...assignmentsPrev,
            [bayId]: { ...item, status: 'placed' },
          }));
        }
        return prev.filter((job) => job.id !== itemId);
      });
      return;
    }

    if (source === 'bay' && fromBayId) {
      setAssignments((prev) => {
        const moving = prev[fromBayId];
        if (!moving) return prev;
        return {
          ...prev,
          [fromBayId]: undefined,
          [bayId]: { ...moving, status: moving.status === 'completed' ? 'completed' : 'placed' },
        };
      });
    }
  };

  const handleDropOnWaiting = (event) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/json');
    if (!payload) return;

    const { itemId, source, fromBayId } = JSON.parse(payload);
    if (source === 'bay' && fromBayId) {
      setAssignments((prev) => {
        const moving = prev[fromBayId];
        if (!moving) return prev;
        setWaitingList((list) => [...list, { ...moving, status: 'waiting' }]);
        return { ...prev, [fromBayId]: undefined };
      });
    }

    if (source === 'waiting') {
      const item = waitingList.find((job) => job.id === itemId);
      if (item) {
        setWaitingList((prev) => prev.filter((job) => job.id !== itemId).concat(item));
      }
    }
  };

  const toggleCompleted = (bayId) => {
    setAssignments((prev) => {
      const item = prev[bayId];
      if (!item) return prev;
      const nextStatus = item.status === 'completed' ? 'placed' : 'completed';
      return {
        ...prev,
        [bayId]: { ...item, status: nextStatus },
      };
    });
  };

  const getCardClasses = (status) => {
    if (status === 'completed') return 'bg-slate-200 text-slate-600 border-slate-300';
    if (status === 'placed') return 'bg-emerald-500 text-white border-emerald-400';
    return 'bg-amber-100 text-amber-900 border-amber-300';
  };

  return (
    <div className="flex flex-1 h-full bg-slate-50 overflow-hidden">
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Shop Bay Schedule</p>
            <h2 className="text-2xl font-black text-slate-900">{monthLabel}</h2>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {BAYS.map((bay) => {
            const item = assignments[bay.id];
            return (
              <div
                key={bay.id}
                className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-4 min-h-[140px] flex flex-col gap-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDropOnBay(event, bay.id)}
              >
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <span>{bay.name}</span>
                  {item ? (
                    <button
                      type="button"
                      onClick={() => toggleCompleted(bay.id)}
                      className="p-1 rounded-full hover:bg-slate-100"
                    >
                      <CheckCircle2 size={16} className={item.status === 'completed' ? 'text-slate-500' : 'text-emerald-500'} />
                    </button>
                  ) : null}
                </div>

                {item ? (
                  <div
                    draggable
                    onDragStart={(event) => startDrag(event, { source: 'bay', itemId: item.id, fromBayId: bay.id })}
                    className={`rounded-2xl border p-4 shadow-sm cursor-grab active:cursor-grabbing ${getCardClasses(item.status)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-black uppercase tracking-widest opacity-70">{item.repairType}</p>
                      <GripVertical size={16} />
                    </div>
                    <p className="text-lg font-black leading-tight">{item.customerName}</p>
                    <p className="text-sm font-semibold opacity-80">{item.carModel}</p>
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mt-2">{item.plateNumber}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-300 font-semibold">
                    Drop job here
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <aside
        className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropOnWaiting}
      >
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Waiting List</p>
          <h3 className="text-xl font-black text-slate-900">Queue</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {waitingList.map((job) => (
            <div
              key={job.id}
              draggable
              onDragStart={(event) => startDrag(event, { source: 'waiting', itemId: job.id })}
              className={`rounded-2xl border p-4 shadow-sm cursor-grab active:cursor-grabbing ${getCardClasses('waiting')}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest opacity-70">{job.repairType}</p>
                <GripVertical size={16} />
              </div>
              <p className="text-lg font-black leading-tight">{job.customerName}</p>
              <p className="text-sm font-semibold opacity-80">{job.carModel}</p>
              <p className="text-xs font-black uppercase tracking-widest opacity-70 mt-2">{job.plateNumber}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default BayScheduler;
