"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import api from "../../config/api";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PhotoIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface Comment {
  id: number;
  comment: string;
  username: string;
  user_id: number;
  created_at: string;
}

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
  comments: Comment[];
}

export default function DetailLaporanPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchLaporan();
  }, [id]);

  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/laporan/${id}`);
      setLaporan(response.data);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        toast.error("Silakan login terlebih dahulu");
        router.push(`/login?redirect=/laporan/${id}`);
      } else if (error.response?.status === 403) {
        toast.error("Anda tidak memiliki akses ke laporan ini");
        router.push("/dashboard");
      } else {
        toast.error("Gagal memuat laporan");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Silakan login untuk berkomentar");
      router.push(`/login?redirect=/laporan/${id}`);
      return;
    }

    if (!newComment.trim()) {
      toast.error("Komentar tidak boleh kosong");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/comments/${id}`, { comment: newComment });
      toast.success("Komentar berhasil ditambahkan");
      setNewComment("");
      fetchLaporan();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Gagal menambahkan komentar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus komentar ini?")) return;

    try {
      await api.delete(`/comments/${commentId}`);
      toast.success("Komentar dihapus");
      fetchLaporan();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menghapus komentar");
    }
  };

  const handleDeleteLaporan = async () => {
    try {
      await api.delete(`/laporan/${id}`);
      toast.success("Laporan berhasil dihapus");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menghapus laporan");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      toast.error("Hanya admin yang bisa mengubah status");
      return;
    }

    setUpdatingStatus(true);
    try {
      await api.patch(`/laporan/${id}/status`, { status: newStatus });
      toast.success(`Status berhasil diubah menjadi ${newStatus}`);
      fetchLaporan();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengubah status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: ClockIcon,
        label: "Menunggu Verifikasi",
      },
      approved: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircleIcon,
        label: "Disetujui",
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: XCircleIcon,
        label: "Ditolak",
      },
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span
        className={`inline-flex items-center gap-2 ${c.bg} ${c.text} px-3 py-1.5 rounded-full text-sm font-semibold`}
      >
        <Icon className="w-4 h-4" />
        {c.label}
      </span>
    );
  };

  const canEdit =
    user && (user.id === laporan?.user_id || user.role === "admin" || user.role === "super_admin");
  const isAdmin = user && (user.role === "admin" || user.role === "super_admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  if (!laporan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">Laporan tidak ditemukan</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Kembali ke Beranda
          </Link>
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
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-800">LAPOR! Masyarakat</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 hidden sm:block">{user.username}</span>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = "/";
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Tombol Kembali */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Kolom Kiri - Detail Laporan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Laporan */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {/* Gambar */}
              {laporan.image && (
                <div
                  className="relative h-64 md:h-80 bg-gray-100 cursor-pointer overflow-hidden"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={`http://localhost:3000${laporan.image}`}
                    alt={laporan.title}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Klik untuk memperbesar
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {laporan.title}
                  </h1>
                  {getStatusBadge(laporan.status)}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6 pb-4 border-b">
                  <span>👤 {laporan.username}</span>
                  <span>📁 {laporan.category_name || "Tidak ada kategori"}</span>
                  <span>📅 {new Date(laporan.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>

                <div className="mb-6">
                  <h2 className="font-semibold text-gray-700 mb-2">Isi Laporan</h2>
                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {laporan.description}
                  </p>
                </div>

                {/* Action Buttons */}
                {canEdit && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Link
                      href={`/dashboard/edit/${laporan.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit Laporan
                    </Link>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Hapus Laporan
                    </button>
                  </div>
                )}

                {/* Admin Status Update */}
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubah Status Laporan
                    </label>
                    <div className="flex gap-2">
                      {["pending", "approved", "rejected"].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(status)}
                          disabled={updatingStatus || laporan.status === status}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            laporan.status === status
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : status === "pending"
                              ? "bg-yellow-500 text-white hover:bg-yellow-600"
                              : status === "approved"
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                        >
                          {status === "pending" && "⏳ Pending"}
                          {status === "approved" && "✓ Approved"}
                          {status === "rejected" && "✗ Rejected"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kolom Kanan - Komentar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border sticky top-24">
              <div className="p-5 border-b bg-gray-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-800">
                    Komentar ({laporan.comments?.length || 0})
                  </h2>
                </div>
              </div>

              {/* Form Tambah Komentar */}
              <div className="p-5 border-b">
                <form onSubmit={handleAddComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      user
                        ? "Tulis komentar Anda..."
                        : "Silakan login untuk berkomentar"
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={!user}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !user}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {submitting ? (
                      "Mengirim..."
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Kirim Komentar
                      </>
                    )}
                  </button>
                  {!user && (
                    <p className="text-center text-sm text-gray-500">
                      <Link
                        href={`/login?redirect=/laporan/${id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Login
                      </Link>{" "}
                      untuk berkomentar
                    </p>
                  )}
                </form>
              </div>

              {/* Daftar Komentar */}
              <div className="p-5 max-h-[500px] overflow-y-auto">
                {laporan.comments && laporan.comments.length > 0 ? (
                  <div className="space-y-4">
                    {laporan.comments.map((comment) => (
                      <div key={comment.id} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-600">
                                {comment.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-sm text-gray-800">
                              {comment.username}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                          {(user?.id === comment.user_id ||
                            user?.role === "admin" ||
                            user?.role === "super_admin") && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm pl-8">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">Belum ada komentar</p>
                    <p className="text-gray-400 text-sm">Jadilah yang pertama!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Preview Gambar */}
      {showImageModal && laporan.image && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full">
            <img
              src={`http://localhost:3000${laporan.image}`}
              alt={laporan.title}
              className="w-full h-auto rounded-lg"
            />
            <button
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
              onClick={() => setShowImageModal(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Laporan */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-2">Hapus Laporan?</h3>
            <p className="text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus laporan ini? Semua komentar juga akan ikut terhapus.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteLaporan}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
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