import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F7F7FB]">
    <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
  </div>
);

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading || user === null) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (!adminOnly && user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
};
