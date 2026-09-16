"use client";

import { useEffect, useRef, useState } from "react";
import type { Order } from "./types";

export type SocketEvent =
  | { type: "product:updated"; payload: { id: string; stock: number; price: number } }
  | { type: "order:new"; payload: Order }
  | { type: "order:statusChanged"; payload: { id: string; status: string } }
  | { type: "notification:new"; payload: { id: string; title: string; message: string } }
  | { type: "ping"; payload: { ts: number } };

let socket: any = null;
let listeners: Set<(evt: SocketEvent) => void> = new Set();
let connectionState = false;

function emitToListeners(evt: SocketEvent) {
  listeners.forEach((fn) => {
    try { fn(evt); } catch (e) { console.error("Socket listener error:", e); }
  });
}

const statusCallbacks = new Set<() => void>();

function notifyStatus() {
  statusCallbacks.forEach((fn) => {
    try { fn(); } catch (e) {}
  });
}

function getSocketInstance(): any {
  if (typeof window === "undefined") return null;
  if (socket) return socket;

  try {
    const { io } = require("socket.io-client");
    const s = io("/", {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    s.on("connect", () => {
      connectionState = true;
      notifyStatus();
    });

    s.on("disconnect", () => {
      connectionState = false;
      notifyStatus();
    });

    s.on("product:updated", (payload: any) => {
      emitToListeners({ type: "product:updated", payload });
    });

    s.on("order:new", (payload: any) => {
      emitToListeners({ type: "order:new", payload });
    });

    s.on("order:statusChanged", (payload: any) => {
      emitToListeners({ type: "order:statusChanged", payload });
    });

    s.on("notification:new", (payload: any) => {
      emitToListeners({ type: "notification:new", payload });
    });

    s.on("ping", (payload: any) => {
      emitToListeners({ type: "ping", payload });
    });

    socket = s;
    return s;
  } catch (e) {
    console.warn("Socket.IO not available:", e);
    return null;
  }
}

export function getSocket() {
  const s = getSocketInstance();
  return {
    on: (event: string, handler: (...args: any[]) => void) => {
      s?.on(event, handler);
      return () => s?.off(event, handler);
    },
    isConnected: () => connectionState,
    connect: () => s?.connect(),
    disconnect: () => s?.disconnect(),
    emit: (event: string, data?: any) => s?.emit(event, data),
  };
}

export function useSocketStatus(): boolean {
  const [connected, setConnected] = useState(connectionState);

  useEffect(() => {
    getSocketInstance();
    setConnected(connectionState);

    const cb = () => setConnected(connectionState);
    statusCallbacks.add(cb);
    return () => { statusCallbacks.delete(cb); };
  }, []);

  return connected;
}

export function useSocketEvents(handler: (evt: SocketEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    getSocketInstance();

    const wrapped = (evt: SocketEvent) => ref.current(evt);
    listeners.add(wrapped);
    return () => { listeners.delete(wrapped); };
  }, []);
}
