import { create } from "zustand"

export const useAppStore = create((set, get) => ({
  business: null,
  branches: [],
  selectedBranchId: localStorage.getItem("luxSelectedBranchId") || "",
  services: [],
  staff: [],
  customers: [],
  appointments: [],
  payments: [],
  expenses: [],
  setBusiness: (business) => set({ business }),
  setBranches: (branches) => set({ branches }),
  setSelectedBranchId: (selectedBranchId) => {
    localStorage.setItem("luxSelectedBranchId", selectedBranchId || "")
    set({ selectedBranchId: selectedBranchId || "" })
  },
  setServices: (services) => set({ services }),
  setStaff: (staff) => set({ staff }),
  setCustomers: (customers) => set({ customers }),
  setAppointments: (appointments) => set({ appointments }),
  setPayments: (payments) => set({ payments }),
  setExpenses: (expenses) => set({ expenses }),
  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [...state.appointments, { id: `apt-${Date.now()}`, ...appointment }],
    })),
  updateAppointmentStatus: (id, status) =>
    set((state) => ({
      appointments: state.appointments.map((apt) => (apt.id === id ? { ...apt, status } : apt)),
    })),
  rescheduleAppointment: (id, time) =>
    set((state) => ({
      appointments: state.appointments.map((apt) => (apt.id === id ? { ...apt, time } : apt)),
    })),
  addService: (service) =>
    set((state) => ({
      services: [...state.services, { id: `srv-${Date.now()}`, ...service }],
    })),
  updateService: (id, updates) =>
    set((state) => ({
      services: state.services.map((srv) => (srv.id === id ? { ...srv, ...updates } : srv)),
    })),
  removeService: (id) =>
    set((state) => ({
      services: state.services.filter((srv) => srv.id !== id),
    })),
  reorderServices: (fromIndex, toIndex) =>
    set((state) => {
      const updated = [...state.services]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return { services: updated }
    }),
  addStaff: (member) =>
    set((state) => ({
      staff: [...state.staff, { id: `st-${Date.now()}`, ...member }],
    })),
  updateStaff: (id, updates) =>
    set((state) => ({
      staff: state.staff.map((member) => (member.id === id ? { ...member, ...updates } : member)),
    })),
  getAppointmentsByDate: (date) => get().appointments.filter((apt) => apt.date === date),
}))
