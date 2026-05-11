"use client";

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
      
      // ✅ Ambil data dari response
      const { token, user: userData } = response.data;
      
      // ✅ Validasi: pastikan token dan userData ada
      if (!token || !userData) {
        toast.error("Login gagal: data tidak lengkap");
        return { success: false, message: "Data tidak lengkap" };
      }
      
      // ✅ Simpan ke localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      toast.success("Login berhasil!");
      return { success: true };
      
    } catch (error) {
      // ✅ Tangani error dari backend
      console.error("Login error:", error);
      
      let errorMessage = "Login gagal";
      
      if (error.response) {
        // Server merespon dengan status error (4xx, 5xx)
        const data = error.response.data;
        errorMessage = data.message || data.error || "Username atau password salah";
        
        // ✅ Tampilkan toast error
        toast.error(errorMessage);
        
      } else if (error.request) {
        // Request dibuat tapi tidak ada respons
        errorMessage = "Tidak dapat terhubung ke server";
        toast.error(errorMessage);
        
      } else {
        // Error lain
        errorMessage = error.message || "Terjadi kesalahan";
        toast.error(errorMessage);
      }
      
      return { success: false, message: errorMessage };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await api.post("/auth/register", { username, password });
      
      toast.success(response.data.message || "Register berhasil! Silakan login.");
      return { success: true };
      
    } catch (error) {
      console.error("Register error:", error);
      
      let errorMessage = "Register gagal";
      
      if (error.response) {
        errorMessage = error.response.data.message || error.response.data.error || "Username sudah digunakan";
        toast.error(errorMessage);
      } else if (error.request) {
        errorMessage = "Tidak dapat terhubung ke server";
        toast.error(errorMessage);
      } else {
        errorMessage = error.message || "Terjadi kesalahan";
        toast.error(errorMessage);
      }
      
      return { success: false, message: errorMessage };
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