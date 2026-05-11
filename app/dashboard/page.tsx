"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../config/api";
import toast from "react-hot-toast";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlusCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface Laporan {
  id: number;
  title: string;
  description: string;
  status: string;
  image: string | null;
  created_at: string;
  category_name: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

useEffect(() => {
  if (!user) {
    router.push("/login");
    return;
  }
  
  // ✅ Jika admin atau super admin, redirect ke dashboard admin
  if (user.role === "admin" || user.role === "super_admin") {
    router.push("/dashboard/admin");
    return;
  }
  
  fetchLaporan();
}, [user, router]);

  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const response = await api.get("/laporan/user/my");
      setLaporan(response.data);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        logout();
        router.push("/login");
      } else {
        toast.error("Gagal memuat laporan");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/laporan/${deleteId}`);
      toast.success("Laporan berhasil dihapus");
      fetchLaporan();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Gagal menghapus laporan");
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: ClockIcon, label: "Menunggu" },
      approved: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircleIcon, label: "Disetujui" },
      rejected: { bg: "bg-red-100", text: "text-red-800", icon: XCircleIcon, label: "Ditolak" },
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 ${c.bg} ${c.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
        <Icon className="w-3.5 h-3.5" />
        {c.label}
      </span>
    );
  };

  const getStatusCount = () => {
    return {
      all: laporan.length,
      pending: laporan.filter((l) => l.status === "pending").length,
      approved: laporan.filter((l) => l.status === "approved").length,
      rejected: laporan.filter((l) => l.status === "rejected").length,
    };
  };

  const filteredLaporan = filter === "all"
    ? laporan
    : laporan.filter((l) => l.status === filter);

  const statusCount = getStatusCount();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ArrowPathIcon className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
  <div className="container mx-auto px-4 py-4 flex justify-between items-center">
    <Link href="/" className="flex items-center gap-2">
      <DocumentTextIcon className="w-8 h-8 text-blue-600" />
      <span className="text-xl font-bold text-gray-800">LAPOR! Masyarakat</span>
    </Link>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-sm">
            {user?.username?.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-gray-700 hidden sm:block">{user?.username}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {user?.role}
        </span>
      </div>
      
      {/* ✅ TOMBOL ADMIN PANEL (hanya untuk admin & super admin) */}
      {(user?.role === "admin" || user?.role === "super_admin") && (
        <Link
          href="/dashboard/admin"
          className="bg-purple-600 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
        >
          Admin Panel
        </Link>
      )}
      
      <button
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="text-red-600 hover:text-red-700 text-sm font-medium"
      >
        Logout
      </button>
    </div>
  </div>
</header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 mb-8 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Halo, {user?.username}! 👋
          </h1>
          <p className="text-blue-100 mb-4">
            Pantau dan kelola laporan yang telah Anda buat di sini.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl transition"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Buat Laporan Baru
          </Link>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total</p>
                <p className="text-2xl font-bold text-gray-800">{statusCount.all}</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Menunggu</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCount.pending}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Disetujui</p>
                <p className="text-2xl font-bold text-green-600">{statusCount.approved}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Ditolak</p>
                <p className="text-2xl font-bold text-red-600">{statusCount.rejected}</p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "all", label: "Semua", count: statusCount.all },
            { key: "pending", label: "Menunggu", count: statusCount.pending, color: "yellow" },
            { key: "approved", label: "Disetujui", count: statusCount.approved, color: "green" },
            { key: "rejected", label: "Ditolak", count: statusCount.rejected, color: "red" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === tab.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Daftar Laporan */}
        {filteredLaporan.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border">
            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Belum ada laporan</h3>
            <p className="text-gray-400 mb-4">Anda belum membuat laporan apapun</p>
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
              <PlusCircleIcon className="w-5 h-5" />
              Buat Laporan Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLaporan.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Thumbnail */}
                  {item.image && (
                    <div className="md:w-24 h-24 flex-shrink-0">
                      <img
                        src={`http://localhost:3000${item.image}`}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-2">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>Kategori: {item.category_name || "-"}</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 md:flex-col">
                    <Link
                      href={`/laporan/${item.id}`}
                      className="p-2 text-gray-500 hover:text-blue-600 transition"
                      title="Lihat Detail"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </Link>
                    <Link
                      href={`/dashboard/edit/${item.id}`}
                      className="p-2 text-gray-500 hover:text-green-600 transition"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => {
                        setDeleteId(item.id);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 transition"
                      title="Hapus"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Konfirmasi Hapus */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-2">Hapus Laporan?</h3>
            <p className="text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}