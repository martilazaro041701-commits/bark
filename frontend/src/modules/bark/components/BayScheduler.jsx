import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  StickyNote,
  GripVertical,
} from "lucide-react";

const BAYS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `Bay ${i + 1}`,
}));
const YEARS = [2026, 2027];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const CELL_WIDTH = 130;

const DEFAULT_JOBS = [
  {
    id: 1,
    customerName: "A. Kim",
    car: "Toyota Camry",
    plate: "ABC-123",
    jobType: "Rear bumper",
    statusCategory: "REPAIR",
    statusName: "Waiting for Scheduling",
  },
  {
    id: 2,
    customerName: "J. Patel",
    car: "Honda Civic",
    plate: "JPG-218",
    jobType: "Body paint",
    statusCategory: "REPAIR",
    statusName: "Waiting for Scheduling",
  },
];

const isWaitingForScheduling = (job) => {
  const category = job.statusCategory || job.status?.category;
  const name =
    job.statusName ||
    job.status?.status_name ||
    job.status?.name ||
    job.status;
  return category === "REPAIR" && name === "Waiting for Scheduling";
};

const daysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const buildDays = (year, monthIndex) => {
  const total = daysInMonth(year, monthIndex);
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(year, monthIndex, i + 1);
    return {
      dayNum: i + 1,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
};

const SchedulingCalendar = ({ jobs = DEFAULT_JOBS }) => {
  const [yearIndex, setYearIndex] = useState(0);
  const [monthIndex, setMonthIndex] = useState(0);

  const days = useMemo(
    () => buildDays(YEARS[yearIndex], monthIndex),
    [yearIndex, monthIndex]
  );

  const [waitingList, setWaitingList] = useState(() =>
    jobs.filter(isWaitingForScheduling)
  );
  const [assignments, setAssignments] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [resizeState, setResizeState] = useState(null);

  useEffect(() => {
    setWaitingList(jobs.filter(isWaitingForScheduling));
  }, [jobs]);

  const handleDragStart = (e, item, source) => {
    setDraggedItem(item);
    setDragSource(source);
    e.dataTransfer.setData("text/plain", "");
  };

  const handleDrop = (e, bayId, dayIndex) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (dragSource === "grid") {
      setAssignments((prev) =>
        prev.map((a) =>
          a.gridId === draggedItem.gridId
            ? { ...a, bayId, startDayIndex: dayIndex }
            : a
        )
      );
    } else {
      const durationDays = Math.min(3, days.length - dayIndex);
      const newAsgn = {
        ...draggedItem,
        gridId: `grid-${Math.random().toString(36).slice(2)}`,
        bayId,
        startDayIndex: dayIndex,
        durationDays: Math.max(1, durationDays),
        completed: false,
        notes: "",
        notesOpen: false,
      };
      setAssignments((prev) => [...prev, newAsgn]);
      setWaitingList((prev) => prev.filter((i) => i.id !== draggedItem.id));
    }
    setDraggedItem(null);
  };

  const toggleComplete = (gridId) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.gridId === gridId ? { ...a, completed: !a.completed } : a
      )
    );
  };

  const toggleNotes = (gridId) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.gridId === gridId ? { ...a, notesOpen: !a.notesOpen } : a
      )
    );
  };

  const updateNotes = (gridId, value) => {
    setAssignments((prev) =>
      prev.map((a) => (a.gridId === gridId ? { ...a, notes: value } : a))
    );
  };

  const startResize = (e, asgn) => {
    e.stopPropagation();
    setResizeState({
      gridId: asgn.gridId,
      startX: e.clientX,
      startDuration: asgn.durationDays,
      startDayIndex: asgn.startDayIndex,
    });
  };

  useEffect(() => {
    if (!resizeState) return;

    const handleMove = (e) => {
      const deltaDays = Math.round(
        (e.clientX - resizeState.startX) / CELL_WIDTH
      );
      const maxDuration = days.length - resizeState.startDayIndex;
      const nextDuration = Math.max(
        1,
        Math.min(maxDuration, resizeState.startDuration + deltaDays)
      );

      setAssignments((prev) =>
        prev.map((a) =>
          a.gridId === resizeState.gridId
            ? { ...a, durationDays: nextDuration }
            : a
        )
      );
    };

    const handleUp = () => setResizeState(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizeState, days.length]);

  const goPrevMonth = () => {
    if (monthIndex > 0) setMonthIndex((m) => m - 1);
    else if (yearIndex > 0) {
      setYearIndex((y) => y - 1);
      setMonthIndex(11);
    }
  };

  const goNextMonth = () => {
    if (monthIndex < 11) setMonthIndex((m) => m + 1);
    else if (yearIndex < YEARS.length - 1) {
      setYearIndex((y) => y + 1);
      setMonthIndex(0);
    }
  };

  return (
    <div className="flex h-[calc(100vh-180px)] bg-[#FFFBF5] rounded-[2rem] overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 px-6 flex items-center justify-between border-b border-stone-200 bg-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Shop Calendar
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase">
              {MONTHS[monthIndex]} {YEARS[yearIndex]}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrevMonth}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goNextMonth}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            <div className="flex sticky top-0 z-20 bg-white border-b border-stone-200">
              <div className="w-24 shrink-0 border-r h-12" />
              {days.map((d, i) => (
                <div
                  key={i}
                  className="w-[130px] shrink-0 text-center py-2 border-r border-stone-100"
                >
                  <div className="text-[8px] font-black text-stone-400 uppercase">
                    {d.dayName}
                  </div>
                  <div className="text-base font-black text-slate-800">
                    {d.dayNum}
                  </div>
                </div>
              ))}
            </div>

            {BAYS.map((bay) => (
              <div
                key={bay.id}
                className="flex h-24 border-b border-stone-100 relative group"
              >
                <div className="w-24 shrink-0 sticky left-0 z-10 bg-white border-r border-stone-200 flex items-center justify-center font-black text-[9px] text-slate-400 uppercase group-hover:bg-slate-50 transition-colors">
                  {bay.name}
                </div>

                <div className="flex">
                  {days.map((_, i) => (
                    <div
                      key={i}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, bay.id, i)}
                      className="w-[130px] shrink-0 border-r border-stone-50 h-full hover:bg-indigo-50/20"
                    />
                  ))}

                  {assignments
                    .filter((a) => a.bayId === bay.id)
                    .map((asgn) => (
                      <div
                        key={asgn.gridId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, asgn, "grid")}
                        className={`absolute top-2 bottom-2 rounded-2xl p-3 z-10 cursor-move border-l-[6px] shadow-lg flex flex-col justify-between transition-all ${
                          asgn.completed
                            ? "bg-slate-200 border-slate-500 text-slate-600"
                            : "bg-emerald-500 border-white text-white"
                        }`}
                        style={{
                          left: `${asgn.startDayIndex * CELL_WIDTH + 118}px`,
                          width: `${asgn.durationDays * CELL_WIDTH - 10}px`,
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black uppercase opacity-70">
                            {asgn.plate}
                          </span>
                          <button onClick={() => toggleComplete(asgn.gridId)}>
                            <CheckCircle2 size={16} />
                          </button>
                        </div>

                        <div>
                          <p className="text-xs font-black truncate">
                            {asgn.customerName}
                          </p>
                          <p className="text-[10px] font-bold opacity-80">
                            {asgn.car}
                          </p>
                          <p className="text-[8px] font-black uppercase tracking-tighter mt-1 border-t border-white/20 pt-1">
                            {asgn.jobType}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={() => toggleNotes(asgn.gridId)}
                            className="text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1"
                          >
                            <StickyNote size={12} /> Notes
                          </button>
                          <span className="text-[9px] font-black uppercase opacity-70">
                            {asgn.durationDays}d
                          </span>
                        </div>

                        {asgn.notesOpen && (
                          <textarea
                            value={asgn.notes}
                            onChange={(e) =>
                              updateNotes(asgn.gridId, e.target.value)
                            }
                            className="mt-2 w-full text-[10px] text-slate-800 rounded-lg p-2 bg-white/90"
                            rows={2}
                            placeholder="Add notes..."
                          />
                        )}

                        <div
                          onMouseDown={(e) => startResize(e, asgn)}
                          className="absolute top-0 right-0 w-3 h-full cursor-ew-resize"
                          title="Drag to extend"
                        />
                        <div className="absolute top-0 right-0 h-full w-3 flex items-center justify-center pointer-events-none">
                          <span className="block w-0.5 h-10 rounded-full bg-white/70" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 shadow-xl">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Waiting for Scheduling
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white border border-stone-100 px-3 py-2">
              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                In Repair
              </div>
              <div className="text-lg font-black text-slate-900">
                {assignments.filter((a) => !a.completed).length}
              </div>
            </div>
            <div className="rounded-xl bg-white border border-stone-100 px-3 py-2">
              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                Pending
              </div>
              <div className="text-lg font-black text-slate-900">
                {waitingList.length}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/10">
          {waitingList.length === 0 && (
            <div className="text-[11px] font-bold text-slate-400 bg-white p-4 rounded-2xl border border-dashed border-stone-200">
              Waiting for Scheduling will show here.
            </div>
          )}
          {waitingList.map((job) => (
            <div
              key={job.id}
              draggable
              onDragStart={(e) => handleDragStart(e, job, "queue")}
              className="bg-amber-50 p-5 rounded-[2rem] border border-amber-200 shadow-sm cursor-grab hover:shadow-md transition-all"
            >
              <div className="flex justify-between mb-2">
                <GripVertical size={16} className="text-amber-300" />
                <span className="text-[8px] font-black text-amber-700 bg-amber-200/50 px-2 py-1 rounded">
                  WAITING
                </span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {job.customerName}
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                {job.car} • {job.plate}
              </p>
              <p className="text-[9px] font-bold text-amber-800 mt-2 border-t border-amber-100 pt-2 uppercase">
                {job.jobType}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulingCalendar;
