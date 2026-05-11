"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../config/api";
import toast from "react-hot-toast";
import {
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

interface Laporan {
  id: number;
  title: string;
  description: string;
  status: string;
  image: string | null;
  created_at: string;
  username: string;
  user_id: number;
  category_name: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  // ✅ DEKLARASI activeTab (INI YANG HILANG)
  const [activeTab, setActiveTab] = useState<"laporan" | "users">("laporan");
  
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: "", password: "", role: "user" });
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const isSuperAdmin = user?.role === "super_admin";
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "super_admin") {
      toast.error("Akses ditolak. Halaman ini hanya untuk admin.");
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [laporanRes, usersRes] = await Promise.all([
        api.get("/laporan"),
        isSuperAdmin ? api.get("/users") : Promise.resolve({ data: [] }),
      ]);
      setLaporan(laporanRes.data);
      if (isSuperAdmin) {
        setUsers(usersRes.data);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/laporan/${id}/status`, { status: newStatus });
      toast.success(`Status berhasil diubah`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengubah status");
    } finally {
      setUpdatingId(null);
    }
  };

  // CRUD USER
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password) {
      toast.error("Username dan password wajib diisi");
      return;
    }
    try {
      await api.post("/users", userForm);
      toast.success("User berhasil ditambahkan");
      setShowUserModal(false);
      setUserForm({ username: "", password: "", role: "user" });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menambah user");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const updateData: any = {};
      if (userForm.username) updateData.username = userForm.username;
      if (userForm.password) updateData.password = userForm.password;
      if (userForm.role) updateData.role = userForm.role;
      
      await api.put(`/users/${editingUser.id}`, updateData);
      toast.success("User berhasil diupdate");
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ username: "", password: "", role: "user" });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal update user");
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    try {
      await api.delete(`/users/${deletingUserId}`);
      toast.success("User berhasil dihapus");
      setShowDeleteUserModal(false);
      setDeletingUserId(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal hapus user");
    }
  };

  const openEditUserModal = (userData: User) => {
    setEditingUser(userData);
    setUserForm({ username: userData.username, password: "", role: userData.role });
    setShowUserModal(true);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Menunggu" },
      approved: { bg: "bg-green-100", text: "text-green-800", label: "Disetujui" },
      rejected: { bg: "bg-red-100", text: "text-red-800", label: "Ditolak" },
    };
    const c = config[status as keyof typeof config] || config.pending;
    return (
      <span className={`inline-flex items-center ${c.bg} ${c.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
        {c.label}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const config = {
      user: "bg-gray-100 text-gray-700",
      admin: "bg-purple-100 text-purple-700",
      super_admin: "bg-red-100 text-red-700",
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${config[role as keyof typeof config] || config.user}`;
  };

  const statistik = {
    total: laporan.length,
    pending: laporan.filter((l) => l.status === "pending").length,
    approved: laporan.filter((l) => l.status === "approved").length,
    rejected: laporan.filter((l) => l.status === "rejected").length,
  };

  const filteredLaporan = laporan.filter((item) => {
    const matchFilter = filter === "all" || item.status === filter;
    const matchSearch =
      search === "" ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.username.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const paginatedLaporan = filteredLaporan.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredLaporan.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Memuat dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex-shrink-0 hidden md:flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Panel</h1>
                <p className="text-xs text-gray-400">LAPOR! Masyarakat</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab("laporan")}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  activeTab === "laporan" ? "bg-gray-800" : "hover:bg-gray-800"
                }`}
              >
                📋 Laporan Masyarakat
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                    activeTab === "users" ? "bg-gray-800" : "hover:bg-gray-800"
                  }`}
                >
                  👥 Manajemen User
                </button>
              )}
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition"
              >
                📱 User Dashboard
              </Link>
            </div>
          </nav>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition"
            >
              🚪 Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* HEADER WITH LOGOUT BUTTON */}
          <header className="bg-white shadow-sm sticky top-0 z-10">
  <div className="px-6 py-4">
    <div className="flex justify-between items-center mb-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {activeTab === "laporan" ? "Dashboard Admin" : "Manajemen User"}
        </h1>
        <p className="text-sm text-gray-500">
          {activeTab === "laporan" 
            ? "Kelola semua laporan masyarakat" 
            : "Tambah, edit, dan hapus user (Super Admin only)"}
        </p>
      </div>
      
      {/* Tombol Logout */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-gray-700 text-sm">{user?.username}</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
            {user?.role === "super_admin" ? "Super Admin" : user?.role}
          </span>
        </div>
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          🚪 Logout
        </button>
      </div>
    </div>
    
    {/* ✅ TAB UNTUK SUPER ADMIN (LANGSUNG TERLIHAT) */}
    {isSuperAdmin && (
      <div className="flex gap-2 mt-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("laporan")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "laporan" 
              ? "bg-blue-600 text-white shadow-md" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          📋 Laporan Masyarakat
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "users" 
              ? "bg-purple-600 text-white shadow-md" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          👥 Manajemen User
        </button>
      </div>
    )}
  </div>
</header>

          <main className="p-6">
            {activeTab === "laporan" ? (
              <>
                {/* STATISTIK CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-500">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Total Laporan</p>
                        <p className="text-3xl font-bold">{statistik.total}</p>
                      </div>
                      <DocumentTextIcon className="w-10 h-10 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-yellow-500">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Menunggu</p>
                        <p className="text-3xl font-bold text-yellow-600">{statistik.pending}</p>
                      </div>
                      <ClockIcon className="w-10 h-10 text-yellow-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-500">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Disetujui</p>
                        <p className="text-3xl font-bold text-green-600">{statistik.approved}</p>
                      </div>
                      <CheckCircleIcon className="w-10 h-10 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-red-500">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Ditolak</p>
                        <p className="text-3xl font-bold text-red-600">{statistik.rejected}</p>
                      </div>
                      <XCircleIcon className="w-10 h-10 text-red-500" />
                    </div>
                  </div>
                </div>

                {/* FILTER & SEARCH */}
                <div className="bg-white rounded-xl shadow-sm mb-6">
                  <div className="p-5 border-b">
                    <div className="flex flex-wrap gap-4 justify-between">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setFilter("all"); setCurrentPage(1); }} className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Semua ({statistik.total})</button>
                        <button onClick={() => { setFilter("pending"); setCurrentPage(1); }} className={`px-4 py-2 rounded-lg text-sm ${filter === "pending" ? "bg-yellow-500 text-white" : "bg-gray-100"}`}>Menunggu ({statistik.pending})</button>
                        <button onClick={() => { setFilter("approved"); setCurrentPage(1); }} className={`px-4 py-2 rounded-lg text-sm ${filter === "approved" ? "bg-green-500 text-white" : "bg-gray-100"}`}>Disetujui ({statistik.approved})</button>
                        <button onClick={() => { setFilter("rejected"); setCurrentPage(1); }} className={`px-4 py-2 rounded-lg text-sm ${filter === "rejected" ? "bg-red-500 text-white" : "bg-gray-100"}`}>Ditolak ({statistik.rejected})</button>
                      </div>
                      <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Cari judul atau pelapor..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10 pr-4 py-2 border rounded-lg w-64" />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr><th className="px-6 py-3 text-left text-xs">ID</th><th className="px-6 py-3 text-left text-xs">Laporan</th><th className="px-6 py-3 text-left text-xs">Pelapor</th><th className="px-6 py-3 text-left text-xs">Kategori</th><th className="px-6 py-3 text-left text-xs">Status</th><th className="px-6 py-3 text-left text-xs">Tanggal</th><th className="px-6 py-3 text-left text-xs">Aksi</th></tr>
                      </thead>
                      <tbody>
                        {paginatedLaporan.map((item) => (
                          <tr key={item.id} className="border-t hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">#{item.id}</td>
                            <td className="px-6 py-4"><div><p className="font-medium">{item.title}</p><p className="text-xs text-gray-400">{item.description.substring(0, 50)}...</p></div></td>
                            <td className="px-6 py-4 text-sm">{item.username}</td>
                            <td className="px-6 py-4 text-sm">{item.category_name || "-"}</td>
                            <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                            <td className="px-6 py-4 text-sm">{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Link href={`/laporan/${item.id}`} className="p-1.5 text-blue-600">👁️</Link>
                                {item.status !== "approved" && <button onClick={() => handleUpdateStatus(item.id, "approved")} disabled={updatingId === item.id} className="px-3 py-1 bg-green-500 text-white text-xs rounded">✓ Terima</button>}
                                {item.status !== "rejected" && <button onClick={() => handleUpdateStatus(item.id, "rejected")} disabled={updatingId === item.id} className="px-3 py-1 bg-red-500 text-white text-xs rounded">✗ Tolak</button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* TABEL MANAJEMEN USER */
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-5 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Daftar User</h2>
                  <button onClick={() => { setEditingUser(null); setUserForm({ username: "", password: "", role: "user" }); setShowUserModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <UserPlusIcon className="w-5 h-5" /> Tambah User
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr><th className="px-6 py-3 text-left">ID</th><th className="px-6 py-3 text-left">Username</th><th className="px-6 py-3 text-left">Role</th><th className="px-6 py-3 text-left">Tanggal Dibuat</th><th className="px-6 py-3 text-left">Aksi</th></tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t hover:bg-gray-50">
                          <td className="px-6 py-4">#{u.id}</td>
                          <td className="px-6 py-4 font-medium">{u.username}</td>
                          <td className="px-6 py-4"><span className={getRoleBadge(u.role)}>{u.role}</span></td>
                          <td className="px-6 py-4 text-sm">{new Date(u.created_at).toLocaleDateString("id-ID")}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => openEditUserModal(u)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">✏️</button>
                              <button onClick={() => { setDeletingUserId(u.id); setShowDeleteUserModal(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="text-center mt-6">
              <button onClick={fetchData} className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600"><ArrowPathIcon className="w-4 h-4" /> Refresh Data</button>
            </div>
          </main>
        </div>
      </div>

      {/* MODAL USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingUser ? "Edit User" : "Tambah User Baru"}</h2>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <input type="text" placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              <input type="password" placeholder="Password (kosongkan jika tidak diubah)" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="user">User Biasa</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="px-4 py-2 border rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{editingUser ? "Update" : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE USER */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">Hapus User?</h2>
            <p className="text-gray-500 mb-6">User akan dihapus permanen. Yakin?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteUserModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 text-white rounded-lg">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}