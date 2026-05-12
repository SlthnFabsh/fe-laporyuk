"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";
import api from "./config/api";
import toast from "react-hot-toast";
import {
  MegaphoneIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ArrowPathIcon,
  PhotoIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
  BoltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  Bars3Icon,
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

// ── Animated Counter ──────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ── Intersection Observer Hook ─────────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; Icon: React.ElementType }> = {
    pending:  { cls: "bg-amber-100 text-amber-700 border-amber-200",  label: "Menunggu",  Icon: ClockIcon },
    approved: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Disetujui", Icon: CheckCircleIcon },
    rejected: { cls: "bg-red-100 text-red-700 border-red-200",       label: "Ditolak",   Icon: XMarkIcon },
  };
  const { cls, label, Icon } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Data
  const [laporanTerbaru, setLaporanTerbaru] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [totalLaporan, setTotalLaporan] = useState(0);
  const [totalApproved, setTotalApproved] = useState(0);

  // Form
  const [formData, setFormData] = useState({ title: "", description: "", category_id: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Navbar
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Stat counters
  const statsRef = useInView(0.3);
  const c1 = useCounter(totalLaporan, 1800, statsRef.inView);
  const c2 = useCounter(totalApproved, 1800, statsRef.inView);
  const c3 = useCounter(1248, 1800, statsRef.inView);

  // Scroll navbar shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [laporanRes, kategoriRes] = await Promise.all([
          api.get("/laporan/public?limit=3"),
          api.get("/categories"),
        ]);
        setLaporanTerbaru(laporanRes.data);
        setCategories(kategoriRes.data);
        setTotalLaporan(laporanRes.data.length * 10);
        const approved = (laporanRes.data as Laporan[]).filter((l) => l.status === "approved").length;
        setTotalApproved(approved * 8);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Pending form restore
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pending") === "true") {
      const pending = sessionStorage.getItem("pendingLaporan");
      if (pending) {
        try {
          const d = JSON.parse(pending);
          setFormData({ title: d.title || "", description: d.description || "", category_id: d.category_id || "" });
          toast.success("Silakan lengkapi dan kirim laporan Anda");
          window.history.replaceState({}, "", "/");
        } catch {}
      }
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    else toast.error("Hanya file gambar yang diperbolehkan");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      sessionStorage.setItem("pendingLaporan", JSON.stringify(formData));
      toast.error("Silakan login terlebih dahulu", { icon: "🔐" });
      router.push("/login?redirect=/");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("description", formData.description);
      fd.append("category_id", formData.category_id);
      if (imageFile) fd.append("image", imageFile);
      await api.post("/laporan", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Laporan berhasil dikirim! ✅", { duration: 4000 });
      setFormData({ title: "", description: "", category_id: "" });
      setImageFile(null); setImagePreview(null);
      const fresh = await api.get("/laporan/public?limit=3");
      setLaporanTerbaru(fresh.data);
    } catch {
      toast.error("Gagal mengirim laporan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-md" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src="/photos/logo.png"
                alt="LaporYuk Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className={`font-extrabold text-lg tracking-tight transition-colors ${scrolled ? "text-gray-900" : "text-white"}`}>
              LaporYuk!
            </span>
            </Link>

            {/* ✅ Desktop nav links - DIHAPUS (Beranda & Semua Laporan) */}

            {/* Auth */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className={`flex items-center gap-2 text-sm font-medium ${scrolled ? "text-gray-700" : "text-white"}`}>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    {user.username}
                  </div>
                  <Link href="/dashboard"
                    className="bg-white text-blue-700 border border-blue-100 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-50 transition shadow-sm">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                    className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-red-600 transition">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login"
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${scrolled ? "border-blue-200 text-blue-600 hover:bg-blue-50" : "border-white/40 text-white hover:bg-white/10"}`}>
                    Login
                  </Link>
                  <Link href="/register"
                    className="bg-white text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-50 transition shadow-sm">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile burger */}
            <button onClick={() => setMenuOpen(!menuOpen)} className={`md:hidden p-2 rounded-lg ${scrolled ? "text-gray-700" : "text-white"}`}>
              <Bars3Icon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile menu - ✅ juga dihapus Beranda & Semua Laporan */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg px-4 py-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/dashboard" className="px-3 py-2 rounded-lg text-blue-600 font-semibold text-sm">Dashboard</Link>
                <button onClick={() => { localStorage.clear(); window.location.href = "/"; }} className="text-left px-3 py-2 rounded-lg text-red-500 text-sm font-medium">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 rounded-lg text-gray-700 text-sm font-medium">Login</Link>
                <Link href="/register" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold text-center">Register</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
{/* ── HERO DENGAN VIDEO BACKGROUND ───────────────────────────────────────────── */}
<section className="relative min-h-screen flex items-center overflow-hidden">
  {/* Video Background */}
  <video
    autoPlay
    loop
    muted
    playsInline
    className="absolute top-0 left-0 w-full h-full object-cover"
  >
    <source src="/videos/city-bg.mp4" type="video/mp4" />
    {/* Fallback jika video tidak bisa diputar */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-violet-700" />
  </video>

  {/* Overlay gelap agar teks tetap terbaca */}
  <div className="absolute inset-0 bg-black/50" />


  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 flex flex-col lg:flex-row items-center gap-16">
    {/* Text - SAMA PERSIS DENGAN SEBELUMNYA */}
    <div className="flex-1 text-center lg:text-left">
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">
        Layanan  <br />
        <span className="text-transparent bg-clip-text bg-blue-400">Aspirasi </span>dan<br />
       <span className="text-transparent bg-clip-text bg-blue-400">Pengaduan Online </span> <br />Rakyat
      </h1>
      <p className="text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
        Sampaikan laporan Anda langsung kepada instansi pemerintah berwenang.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
        <Link
          href={user ? "/laporan/create" : "/login"}
          className="group inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/30 hover:bg-blue-50 transition-all hover:scale-105 hover:shadow-2xl"
        >
          <DocumentTextIcon className="w-5 h-5" />
          Buat Laporan
          <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>

    {/* Floating card — quick form - SAMA PERSIS */}
    <div className="flex-1 w-full max-w-md">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
        <p className="text-white font-bold text-lg mb-5 flex items-center gap-2">

          Lapor Sekarang
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/60 text-sm"
            placeholder="Judul laporan Anda..."
            required
          />
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/60 text-sm [&>option]:bg-blue-800"
            required
          >
            <option value="">Pilih Kategori...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/60 text-sm resize-none"
            placeholder="Ceritakan dengan jelas... lokasi, waktu, kronologi."
            required
          />
          {/* Image Upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput")?.click()}
            className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition ${isDragging ? "border-white bg-white/20" : "border-white/40 hover:border-white/70"}`}
          >
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-24 rounded-lg" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <p className="text-white/60 text-xs flex items-center justify-center gap-1">
                <PhotoIcon className="w-4 h-4" /> Upload foto (opsional)
              </p>
            )}
            <input id="fileInput" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-blue-700 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition disabled:opacity-60 shadow-lg flex items-center justify-center gap-2"
          >
            {submitting ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Mengirim...</> : "Kirim Laporan →"}
          </button>
        </form>
      </div>
    </div>
  </div>

  {/* Wave bottom - opsional, bisa dihapus jika video sudah padat */}
  <div className="absolute bottom-0 inset-x-0">
    <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full block">
      <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#F8FAFC" />
    </svg>
  </div>
</section>

      {/* ── FITUR ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-widest">Keunggulan Kami</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2">Mengapa LaporYuk?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Platform yang dirancang untuk kemudahan, transparansi, dan aksi nyata.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                emoji: "📝",
                color: "blue",
                title: "Mudah & Cepat",
                desc: "Kirim laporan dalam hitungan menit. Antarmuka yang intuitif memudahkan siapa pun untuk melaporkan masalah.",
                features: ["Form sederhana", "Upload foto", "Tanpa birokrasi"],
              },
              {
                emoji: "👁️",
                color: "violet",
                title: "Transparan",
                desc: "Pantau status laporan Anda secara real-time. Setiap perubahan status akan terlihat langsung di dashboard.",
                features: ["Status real-time", "Histori laporan", "Notifikasi update"],
              },
              {
                emoji: "⚡",
                color: "amber",
                title: "Tindak Lanjut",
                desc: "Laporan Anda ditangani oleh tim profesional dan diteruskan ke instansi berwenang yang tepat.",
                features: ["Verifikasi < 3 hari", "Tim responsif", "Laporan ke instansi"],
              },
            ].map(({ emoji, color, title, desc, features }) => (
              <div key={title}
                className={`group relative bg-gradient-to-b from-${color}-50 to-white border border-${color}-100 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full -translate-y-8 translate-x-8`} />
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">{desc}</p>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircleIcon className={`w-4 h-4 text-${color}-500 flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARA KERJA ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-widest">Prosedur</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2">Cara Kerja</h2>
            <p className="text-gray-500 mt-3">4 langkah mudah dari laporan hingga penyelesaian</p>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-emerald-200" />
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "1", icon: "✍️", title: "Tulis Laporan",     desc: "Isi form dengan judul, kategori, deskripsi dan foto pendukung",     color: "blue",   time: "" },
                { step: "2", icon: "🔍", title: "Verifikasi",        desc: "Tim kami memverifikasi laporan Anda dalam waktu maksimal 3 hari",   color: "violet", time: "< 3 hari" },
                { step: "3", icon: "📨", title: "Tindak Lanjut",     desc: "Laporan diteruskan ke instansi berwenang untuk ditindaklanjuti",    color: "amber",  time: "< 5 hari" },
                { step: "4", icon: "✅", title: "Selesai",           desc: "Laporan selesai diproses dan Anda mendapatkan konfirmasi",          color: "emerald", time: "" },
              ].map(({ step, icon, title, desc, color, time }) => (
                <div key={step} className="relative flex flex-col items-center text-center group">
                  <div className={`relative z-10 w-20 h-20 bg-white border-4 border-${color}-200 group-hover:border-${color}-400 rounded-full flex flex-col items-center justify-center shadow-lg mb-5 transition-all duration-300 group-hover:scale-110`}>
                    <span className="text-2xl leading-none">{icon}</span>
                    <span className={`text-xs font-bold text-${color}-600 leading-none`}>Step {step}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-2">{desc}</p>
                  {time && <span className={`inline-block bg-${color}-100 text-${color}-700 text-xs font-semibold px-3 py-1 rounded-full`}>{time}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LAPORAN TERBARU SECTION - DIHAPUS ───────────────────────────────── */}

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
{/* ── CTA BANNER DENGAN GAMBAR ─────────────────────────────────────────────── */}
<section className="relative py-20 overflow-hidden">
  {/* Gambar Background */}
  <div className="absolute inset-0">
    <img 
      src="/photos/cta-bg.jpg" 
      alt="Background" 
      className="w-full h-full object-cover"
    />
    {/* Overlay gelap agar teks terbaca */}
    <div className="absolute inset-0 bg-black/60" />
  </div>

  {/* Efek装饰 (opsional) */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/5 rounded-full" />
    <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-white/5 rounded-full" />
  </div>

  {/* Konten */}
  <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
    <div className="text-5xl mb-4">📣</div>
    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Suaramu Berharga</h2>
    <p className="text-blue-100 text-lg mb-8">
      Setiap laporan yang masuk akan kami tindaklanjuti. 
      Bersama-sama kita wujudkan pelayanan publik yang lebih baik.
    </p>
    <Link
      href={user ? "/laporan/create" : "/register"}
      className="inline-flex items-center gap-2 bg-white text-blue-700 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-2xl shadow-black/30"
    >
      {user ? "Buat Laporan Sekarang" : "Bergabung Sekarang"}
      <ChevronRightIcon className="w-5 h-5" />
    </Link>
  </div>
</section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
            <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src="/photos/logo.png"
                alt="LaporYuk Logo" 
                className="w-full h-full object-cover"
              />
            </div>
                <span className="text-white font-extrabold text-lg">LaporYuk!</span>
              </Link>
              <p className="text-sm leading-relaxed">Layanan Aspirasi dan Pengaduan Online Masyarakat. Platform resmi untuk menyampaikan laporan dan aspirasi.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Navigasi</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/login" className="hover:text-white transition-colors">Login</Link>
                <Link href="/register" className="hover:text-white transition-colors">Register</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Kontak</h4>
              <div className="text-sm space-y-1">
                <p>📧 lapor@masyarakat.go.id</p>
                <p>📞 (021) 123-4567</p>
                <p>🕒 Senin – Jumat, 08.00 – 16.00 WIB</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm">
            <p>© 2026 LaporYuk! — Hak Cipta Dilindungi</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}