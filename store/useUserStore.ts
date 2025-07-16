import { create } from "zustand";

export const useUserStore = create<any>((set) => ({
  user: null,
  setUser: (user: any) => set({ user }),
}));
