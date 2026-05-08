"use client"; // ✅ HARUS DI BARIS PERTAMA!

import { createContext, useContext, useState, useEffect } from "react";
import api from "../config/api";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post("/auth/login", { username, password });
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      toast.success("Login berhasil!");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login gagal";
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (username, password) => {
    try {
      await api.post("/auth/register", { username, password });
      toast.success("Register berhasil! Silakan login.");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Register gagal";
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logout berhasil!");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};