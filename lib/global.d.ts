declare global {
  var __io: import("socket.io").Server | undefined;
  var __emit: ((event: string, payload: unknown) => void) | undefined;
}

export {};
