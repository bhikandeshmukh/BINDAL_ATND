"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case "success":
                return "✅";
            case "error":
                return "❌";
            case "warning":
                return "⚠️";
            case "info":
                return "ℹ️";
        }
    };

    const getColors = () => {
        switch (type) {
            case "success":
                return "bg-green-500 border-green-600";
            case "error":
                return "bg-red-500 border-red-600";
            case "warning":
                return "bg-yellow-500 border-yellow-600";
            case "info":
                return "bg-blue-500 border-blue-600";
        }
    };

    return (
        <div
            className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
        >
            <div
                className={`${getColors()} text-white px-6 py-3 rounded-lg shadow-lg border-l-4 flex items-center gap-3 min-w-[300px] max-w-md`}
            >
                <span className="text-2xl">{getIcon()}</span>
                <p className="flex-1 font-medium">{message}</p>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="text-white hover:text-gray-200 font-bold text-xl"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

// Toast Container Component
interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        // Listen for custom toast events
        const handleToast = (event: CustomEvent) => {
            const { message, type } = event.detail;
            const id = Date.now();
            setToasts((prev) => [...prev, { id, message, type }]);
        };

        window.addEventListener("show-toast" as any, handleToast);
        return () => window.removeEventListener("show-toast" as any, handleToast);
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

// Helper function to show toast
export function showToast(message: string, type: ToastType = "info") {
    const event = new CustomEvent("show-toast", {
        detail: { message, type },
    });
    window.dispatchEvent(event);
}
