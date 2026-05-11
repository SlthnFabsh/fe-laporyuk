"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";
import api from "./config/api";
import toast from "react-hot-toast";
import { 
  HomeIcon, 
  MegaphoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface Laporan {
  id: number;
  title: string;
  description: string;
  status: string;
  image: string | null;
  created_at: string;
  username: string;
  category_name: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [laporanTerbaru, setLaporanTerbaru] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [laporanRes, kategoriRes] = await Promise.all([
          api.get("/laporan/public?limit=6"),
          api.get("/categories"),
        ]);
        setLaporanTerbaru(laporanRes.data);
        setCategories(kategoriRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pending") === "true") {
      const pendingData = sessionStorage.getItem("pendingLaporan");
      if (pendingData) {
        try {
          const data = JSON.parse(pendingData);
          setFormData({
            title: data.title || "",
            description: data.description || "",
            category_id: data.category_id || "",
          });
          toast.success("Silakan lengkapi data dan kirim laporan Anda");
          window.history.replaceState({}, "", "/");
        } catch (e) {
          console.error("Error parsing pending data:", e);
        }
      }
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    } else {
      setImagePreview(null);
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
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      toast.error("Hanya file gambar yang diperbolehkan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      sessionStorage.setItem("pendingLaporan", JSON.stringify({
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
      }));
      toast.error("Silakan login terlebih dahulu", {
        icon: '🔐',
        duration: 3000,
      });
      router.push("/login?redirect=/");
      return;
    }

    setSubmitting(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("description", formData.description);
      submitFormData.append("category_id", formData.category_id);
      if (imageFile) {
        submitFormData.append("image", imageFile);
      }

      await api.post("/laporan", submitFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      toast.success("Laporan berhasil dikirim!", {
        icon: '✅',
        duration: 4000,
      });
      setFormData({ title: "", description: "", category_id: "" });
      setImageFile(null);
      setImagePreview(null);
      
      const freshLaporan = await api.get("/laporan/public?limit=6");
      setLaporanTerbaru(freshLaporan.data);
      
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim laporan");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Menunggu Verifikasi", icon: ClockIcon },
      approved: { bg: "bg-green-100", text: "text-green-800", label: "Disetujui", icon: CheckCircleIcon },
      rejected: { bg: "bg-red-100", text: "text-red-800", label: "Ditolak", icon: XMarkIcon },
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 ${c.bg} ${c.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header - Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <MegaphoneIcon className="w-8 h-8" />
              <span>LAPOR! Masyarakat</span>
            </Link>
            <div className="flex gap-3">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.username}</span>
                  </div>
                  <Link href="/dashboard" className="bg-white text-blue-700 px-5 py-2 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg">
                    Dashboard
                  </Link>
                  <button 
                    onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                    className="bg-red-600/80 backdrop-blur px-5 py-2 rounded-full font-semibold hover:bg-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link href="/login" className="px-5 py-2 rounded-full border border-white hover:bg-white/10 transition">Login</Link>
                  <Link href="/register" className="px-5 py-2 rounded-full bg-white text-blue-700 font-semibold hover:bg-gray-100 transition">Register</Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Hero Text */}
          <div className="text-center py-12 md:py-20">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Sampaikan Aspirasimu</h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
            Suaramu berharga. Laporkan keluhan, aspirasi, atau informasi dengan mudah dan cepat.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Form Laporan - Card Modern */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-16 border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Buat Laporan Baru</h2>
            <p className="text-blue-100 text-sm">Isi form di bawah ini dengan lengkap dan jelas</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Judul Laporan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Contoh: Jalan Rusak di Depan Sekolah"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-2">Klasifikasi Laporan <span className="text-red-500">*</span></label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Pilih Klasifikasi</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">Isi Laporan <span className="text-red-500">*</span></label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Tuliskan laporan Anda dengan jelas dan lengkap... sertakan waktu, lokasi, dan kronologi kejadian jika diperlukan."
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">Foto Pendukung (Opsional)</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg shadow" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PhotoIcon className="w-12 h-12 text-gray-400" />
                    <p className="text-gray-500">Klik atau drag & drop gambar di sini</p>
                    <p className="text-gray-400 text-sm">Maks 2MB (JPG, PNG, GIF)</p>
                  </div>
                )}
                <input id="fileInput" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none shadow-lg"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Mengirim Laporan...
                </span>
              ) : (
                "Kirim Laporan"
              )}
            </button>
          </form>
        </div>

        {/* 3 Langkah Cara Lapor */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            { step: "01", title: "Tulis Laporan", desc: "Laporkan keluhan atau aspirasi Anda dengan jelas dan lengkap", color: "blue" },
            { step: "02", title: "Proses Verifikasi", desc: "Laporan akan diverifikasi dan diteruskan ke instansi berwenang", color: "indigo" },
            { step: "03", title: "Tindak Lanjut", desc: "Instansi akan menindaklanjuti dan membalas laporan Anda", color: "purple" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-center hover:shadow-lg transition">
              <div className={`w-16 h-16 bg-${item.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className={`text-${item.color}-600 font-bold text-2xl`}>{item.step}</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Daftar Laporan Terbaru */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Laporan Terbaru</h2>
            <Link href="/laporan" className="text-blue-600 hover:underline text-sm">Lihat Semua →</Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : laporanTerbaru.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400 border">
              <MegaphoneIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Belum ada laporan. Jadilah yang pertama!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {laporanTerbaru.map((l) => (
                <Link key={l.id} href={`/laporan/${l.id}`} className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {l.image && (
                    <div className="h-40 overflow-hidden">
                      <img src={`http://localhost:3000${l.image}`} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-gray-800 line-clamp-1">{l.title}</h3>
                      {getStatusBadge(l.status)}
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">{l.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{l.username}</span>
                      <span>{new Date(l.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Statistik & Footer */}
        <div className="mt-12 pt-8 border-t text-center text-gray-400 text-sm">
          <p>© 2024 LAPOR! Masyarakat - Layanan Aspirasi dan Pengaduan Online</p>
          <p className="mt-1">Total laporan yang sudah masuk: {laporanTerbaru.length}+</p>
        </div>
      </main>
    </div>
  );
}