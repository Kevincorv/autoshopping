"use client";

import React from "react";

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: error?.message || "Algo salió mal" };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 m-4">
          <h2 className="text-lg font-semibold text-brand-400">Algo salió mal</h2>
          <p className="text-sm text-neutral-400 mt-2">{this.state.message}</p>
          <button
            className="btn-primary mt-4"
            onClick={() => this.setState({ hasError: false, message: undefined })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
