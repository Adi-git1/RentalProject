"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

const noop = () => () => {};
/** false during SSR and the first client render, true thereafter. */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export interface CartLine {
  itemId: string;
  slug: string;
  name: string;
  photo: string | null;
  qty: number;
  priceDay: number;
  priceWeekend: number | null;
  priceWeek: number | null;
  deposit: number;
}

interface CartState {
  lines: CartLine[];
  startISO: string | null;
  endISO: string | null;
}

interface CartContextValue extends CartState {
  count: number;
  addLine: (line: CartLine) => void;
  updateQty: (itemId: string, qty: number) => void;
  removeLine: (itemId: string) => void;
  setDates: (startISO: string | null, endISO: string | null) => void;
  clear: () => void;
  hydrated: boolean;
}

const STORAGE_KEY = "anytimerental.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

const EMPTY: CartState = { lines: [], startISO: null, endISO: null };

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Read persisted cart once, lazily. On the server localStorage is undefined
  // so this is EMPTY; the client's first render picks up stored state. Consumers
  // wait for `hydrated` before rendering cart-dependent UI to avoid mismatches.
  const [state, setState] = useState<CartState>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && Array.isArray(parsed.lines)) return parsed;
      }
    } catch {
      /* ignore corrupt storage */
    }
    return EMPTY;
  });
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [state, hydrated]);

  const addLine = useCallback((line: CartLine) => {
    setState((s) => {
      const existing = s.lines.find((l) => l.itemId === line.itemId);
      const lines = existing
        ? s.lines.map((l) =>
            l.itemId === line.itemId ? { ...l, qty: l.qty + line.qty } : l,
          )
        : [...s.lines, line];
      return { ...s, lines };
    });
  }, []);

  const updateQty = useCallback((itemId: string, qty: number) => {
    setState((s) => ({
      ...s,
      lines: s.lines
        .map((l) => (l.itemId === itemId ? { ...l, qty: Math.max(0, qty) } : l))
        .filter((l) => l.qty > 0),
    }));
  }, []);

  const removeLine = useCallback((itemId: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.itemId !== itemId) }));
  }, []);

  const setDates = useCallback((startISO: string | null, endISO: string | null) => {
    setState((s) => ({ ...s, startISO, endISO }));
  }, []);

  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      addLine,
      updateQty,
      removeLine,
      setDates,
      clear,
      hydrated,
    }),
    [state, addLine, updateQty, removeLine, setDates, clear, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
