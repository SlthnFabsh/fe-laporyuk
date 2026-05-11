"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";
import api from "../../../config/api";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface Laporan {
  id: number;
  title: string;
  description: string;
  category_id: number;
  image: string | null;
  status: string;
}

export default function EditLaporanPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [user, id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [laporanRes, categoriesRes] = await Promise.all([
        api.get(`/laporan/${id}`),
        api.get("/categories"),
      ]);

      const laporan = laporanRes.data;

      // Cek apakah user berhak edit
      if (user.role !== "admin" && user.role !== "super_admin" && laporan.user_id !== user.id) {
        toast.error("Anda tidak memiliki akses untuk mengedit laporan ini");
        router.push("/dashboard");
        return;
      }

      setFormData({
        title: laporan.title,
        description: laporan.description,
        category_id: laporan.category_id?.toString() || "",
      });
      setCurrentImage(laporan.image);
      setCategories(categoriesRes.data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Gagal memuat data");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    } else {
      toast.error("Hanya file gambar yang diperbolehkan");
    }
  };

  const handleRemoveImage = () => {
    if (currentImage && !imageFile) {
      setRemoveImage(true);
      setCurrentImage(null);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("description", formData.description);
      submitFormData.append("category_id", formData.category_id);

      if (imageFile) {
        submitFormData.append("image", imageFile);
      }

      if (removeImage && !imageFile && currentImage) {
        // Kirim flag untuk hapus gambar
        submitFormData.append("remove_image", "true");
      }

      await api.put(`/laporan/${id}`, submitFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Laporan berhasil diperbarui!");
      router.push(`/laporan/${id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Gagal memperbarui laporan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ArrowPathIcon className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Edit Laporan</h1>
          <div className="w-20"></div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Perbarui Laporan Anda</h2>
            <p className="text-blue-100 text-sm">Ubah informasi laporan yang sudah dibuat</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Judul */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Judul Laporan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Contoh: Jalan Rusak di Depan Sekolah"
                required
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Klasifikasi Laporan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Pilih Klasifikasi</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Isi Laporan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Tuliskan laporan Anda dengan jelas dan lengkap..."
                required
              />
            </div>

            {/* Gambar Saat Ini */}
            {currentImage && !removeImage && !imageFile && (
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Gambar Saat Ini</label>
                <div className="relative inline-block">
                  <img
                    src={`http://localhost:3000${currentImage}`}
                    alt="Current"
                    className="h-32 w-auto rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Klik icon tong sampah untuk menghapus gambar</p>
              </div>
            )}

            {/* Upload Gambar Baru */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Ganti Gambar (Opsional)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
                }`}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg shadow" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PhotoIcon className="w-12 h-12 text-gray-400" />
                    <p className="text-gray-500">Klik atau drag & drop gambar baru di sini</p>
                    <p className="text-gray-400 text-sm">Maks 2MB (JPG, PNG, GIF)</p>
                  </div>
                )}
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Tombol Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
              <Link
                href={`/laporan/${id}`}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Batal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}