"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";
import api from "./config/api";
import toast from "react-hot-toast";

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
  
  // State untuk form
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Ambil daftar kategori & laporan terbaru
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [laporanRes, kategoriRes] = await Promise.all([
          api.get("/laporan?limit=5"),
          api.get("/categories"),
        ]);
        setLaporanTerbaru(laporanRes.data.slice(0, 5));
        setCategories(kategoriRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Jika belum login, simpan data ke sessionStorage dan arahkan ke login
    if (!user) {
      sessionStorage.setItem("pendingLaporan", JSON.stringify({
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
      }));
      // Simpan juga file image? File tidak bisa disimpan di sessionStorage
      // Alternatif: simpan ke IndexedDB atau minta upload ulang nanti
      toast.error("Silakan login terlebih dahulu untuk melanjutkan");
      router.push("/login?redirect=/");
      return;
    }

    // Jika sudah login, langsung kirim
    setSubmitting(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("description", formData.description);
      submitFormData.append("category_id", formData.category_id);
      if (imageFile) {
        submitFormData.append("image", imageFile);
      }

      const response = await api.post("/laporan", submitFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      toast.success("Laporan berhasil dikirim!");
      setFormData({ title: "", description: "", category_id: "" });
      setImageFile(null);
      
      // Refresh daftar laporan terbaru
      const freshLaporan = await api.get("/laporan?limit=5");
      setLaporanTerbaru(freshLaporan.data.slice(0, 5));
      
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim laporan");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
    };
    return `${colors[status as keyof typeof colors] || "bg-gray-500"} text-white px-2 py-1 rounded-full text-xs`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">LAPOR! Masyarakat</Link>
          <div className="flex gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span>Halo, {user.username}</span>
                <Link href="/dashboard" className="bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-gray-100">
                  Dashboard
                </Link>
                <button 
                  onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                  className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="hover:underline">Login</Link>
                <Link href="/register" className="hover:underline">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero / Form Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Sampaikan Laporan Anda</h1>
          <p className="text-center text-gray-500 mb-6">Laporkan keluhan, aspirasi, atau permintaan informasi Anda</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Judul Laporan <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tulis judul singkat laporan Anda"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Klasifikasi Laporan <span className="text-red-500">*</span></label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
                required
              >
                <option value="">Pilih Klasifikasi</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Isi Laporan <span className="text-red-500">*</span></label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tuliskan laporan Anda dengan jelas dan lengkap"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Foto Pendukung (Opsional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {submitting ? "Mengirim..." : "Kirim Laporan"}
            </button>
          </form>
        </div>

        {/* Cara Penyampaian - 3 Langkah */}
        <div className="grid md:grid-cols-3 gap-6 mb-10 text-center">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-blue-600 text-3xl font-bold mb-2">1</div>
            <h3 className="font-bold mb-1">Tulis Laporan</h3>
            <p className="text-gray-500 text-sm">Laporkan keluhan atau aspirasi Anda dengan jelas dan lengkap</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-blue-600 text-3xl font-bold mb-2">2</div>
            <h3 className="font-bold mb-1">Proses Verifikasi</h3>
            <p className="text-gray-500 text-sm">Laporan akan diverifikasi dan diteruskan ke instansi berwenang</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-blue-600 text-3xl font-bold mb-2">3</div>
            <h3 className="font-bold mb-1">Tindak Lanjut</h3>
            <p className="text-gray-500 text-sm">Instansi akan menindaklanjuti dan membalas laporan Anda</p>
          </div>
        </div>

        {/* Daftar Laporan Terbaru (Publik) */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Laporan Terbaru</h2>
          {loading ? (
            <p className="text-center py-8">Memuat laporan...</p>
          ) : laporanTerbaru.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Belum ada laporan</p>
          ) : (
            <div className="space-y-3">
              {laporanTerbaru.map((l) => (
                <Link key={l.id} href={`/laporan/${l.id}`} className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{l.title}</h3>
                        <span className={getStatusBadge(l.status)}>{l.status}</span>
                      </div>
                      <p className="text-gray-500 text-sm line-clamp-2">{l.description}</p>
                      <p className="text-xs text-gray-400 mt-2">Dilaporkan oleh: {l.username}</p>
                    </div>
                    {l.image && (
                      <img src={`http://localhost:3000${l.image}`} alt="thumbnail" className="w-16 h-16 object-cover rounded" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Statistik */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          🧾 Total laporan yang sudah masuk: {laporanTerbaru.length}+
        </div>
      </main>
    </div>
  );
}