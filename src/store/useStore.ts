import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AttendanceRecordInput {
  employeeId: string;
  status: "present" | "absent" | "half_day" | "leave" | "holiday";
  otHours: number;
  notes: string;
  checkIn?: string;
  checkOut?: string;
}

interface QueuedAttendance {
  date: string;
  records: AttendanceRecordInput[];
}

interface AppState {
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  attendanceQueue: QueuedAttendance[];
  addAttendanceToQueue: (date: string, records: AttendanceRecordInput[]) => void;
  removeAttendanceFromQueue: (date: string) => void;
  clearAttendanceQueue: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isOnline: typeof window !== "undefined" ? window.navigator.onLine : true,
      setIsOnline: (status) => set({ isOnline: status }),
      selectedDate: new Date().toISOString().split("T")[0],
      setSelectedDate: (date) => set({ selectedDate: date }),
      
      attendanceQueue: [],
      addAttendanceToQueue: (date, records) => {
        const currentQueue = get().attendanceQueue;
        // Filter out any existing entries for this date
        const filtered = currentQueue.filter((q) => q.date !== date);
        set({
          attendanceQueue: [...filtered, { date, records }],
        });
      },
      removeAttendanceFromQueue: (date) => {
        set({
          attendanceQueue: get().attendanceQueue.filter((q) => q.date !== date),
        });
      },
      clearAttendanceQueue: () => set({ attendanceQueue: [] }),
    }),
    {
      name: "attendmind-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        attendanceQueue: state.attendanceQueue,
      }),
    }
  )
);
