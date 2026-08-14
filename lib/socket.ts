"use client";

import { useEffect, useRef, useState } from "react";
import type { Product, Order, DashboardStats } from "./types";

export type SocketEvent =
  | { type: "product:updated"; payload: { id: string; stock: number; price: number } }
  | { type: "order:new"; payload: Order }
  | { type: "ping"; payload: { ts: number } };

export function getSocket() {
  return { on: () => () => {}, isConnected: () => false, connect: () => {}, disconnect: () => {} };
}

export function useSocketStatus(): boolean {
  const [connected] = useState(false);
  return connected;
}

export function useSocketEvents(_handler: (evt: SocketEvent) => void) {
  const ref = useRef(_handler);
  ref.current = _handler;
  useEffect(() => {});
}
