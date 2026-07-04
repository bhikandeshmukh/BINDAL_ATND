"use client";

import { useState } from "react";
import { AuthUser } from "@/app/page";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import RegisterForm from "./RegisterForm";

interface LoginFormProps {
    onLogin: (user: AuthUser) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                // Store token
                if (data.token) {
                    localStorage.setItem("token", data.token);
                }
                onLogin(data.user);
            } else {
                setError(data.error || "Login failed");
            }
        } catch (error) {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.token) {
                    localStorage.setItem("token", data.token);
                }
                onLogin(data.user);
            } else {
                setError(data.error || "Google login failed");
            }
        } catch (error) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError("Google login failed. Please try again.");
    };

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
                {isRegister ? (
                    <RegisterForm
                        onRegisterSuccess={onLogin}
                        onBackToLogin={() => setIsRegister(false)}
                        handleGoogleSuccess={handleGoogleSuccess}
                        handleGoogleError={handleGoogleError}
                    />
                ) : (
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] p-8 w-full max-w-md border border-white/20 transition-all duration-300">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                                Bindal Punching
                            </h1>
                            <p className="text-slate-500 font-semibold text-sm">Sign in to continue</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({ ...formData, username: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter your username"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter your password"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-medium">
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 shadow-lg shadow-blue-100 active:scale-[0.98] transition-all duration-200"
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white text-slate-400 font-bold uppercase tracking-wider">Or continue with</span>
                            </div>
                        </div>

                        {/* Google Sign In */}
                        <div className="flex justify-center mb-5">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                useOneTap
                                theme="outline"
                                size="large"
                                text="signin_with"
                                shape="rectangular"
                                width="100%"
                            />
                        </div>

                        <div className="text-center mt-5 border-t border-slate-100 pt-4">
                            <p className="text-sm text-slate-500">
                                Don't have an account?{" "}
                                <button
                                    onClick={() => setIsRegister(true)}
                                    className="text-blue-600 font-extrabold hover:underline focus:outline-none"
                                >
                                    Register Here
                                </button>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </GoogleOAuthProvider>
    );
}
