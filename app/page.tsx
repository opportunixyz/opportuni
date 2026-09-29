"use client";

import Link from "next/link";
import { useState } from "react";

const testimonios = [
  { nombre: "Valentina R.", texto: "Encontré la beca que me trajo a estudiar a Países Bajos gracias a que la compartieron en el grupo.", rol: "Beca Erasmus · Ingeniería", color: "var(--rosa)" },
  { nombre: "Diego M.", texto: "Apliqué a una vacante de product manager que vi en el grupo. A la semana tenía entrevista en Nubank.", rol: "PM en fintech · Negocios", color: "var(--nar)" },
  { nombre: "Mariana G.", texto: "El review de CV me ayudó un montón para el proceso de Google. Super recomendado.", rol: "SWE Intern · Creativos", color: "var(--lila)" },
];

const categorias = [
  { label: "Ingeniería", color: "badge-rosa" },
  { label: "Negocios", color: "badge-naranja" },
  { label: "Estudios Creativos", color: "badge-lila" },
  { label: "Ciencias Sociales", color: "badge-teal" },
  { label: "Web3", color: "badge-rosa" },
];

const faqs = [
  {
    question: "¿Opportuni es gratis?",
    answer: "Sí. El grupo de WhatsApp y el chat son gratis. El CV Builder cuesta $150 MXN y la Asesoría 1:1 $300 MXN."
  },
  {
    question: "¿Qué tipo de oportunidades encuentro?",
    answer: "Becas, vacantes, programas de aceleración, retos y cursos gratuitos para jóvenes en México y Colombia."
  },
  {
    question: "¿Cómo funciona el chat?",
    answer: "Le describes qué buscas y te filtra las mejores opciones en segundos. Como un asistente personal de oportunidades."
  },
  {
    question: "¿Para quién es Opportuni?",
    answer: "Estudiantes y recién egresados en México y Colombia. No importa tu carrera ni tu universidad."
  },
  {
    question: "¿Las oportunidades están verificadas?",
    answer: "Sí. Todo lo que publicamos es legítimo, con fuente oficial y fecha vigente. Tu tiempo vale."
  },
];

export default function Home() {
  const [showDrop, setShowDrop] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStep1Drop, setShowStep1Drop] = useState(false);
  const [showStep2Drop, setShowStep2Drop] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* ========== NAV ========== */}
      <nav className="nav-bento">
        <div className="flex items-center gap-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 40, width: "auto" }} />
          <span className="font-gabarito text-[22px] font-black text-opportuni-dark">Opportuni</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {[
            { href: "#como", label: "Cómo funciona" },
            { href: "#servicios", label: "Servicios" },
            { href: "#testimonios", label: "Historias" },
            { href: "#faq", label: "FAQ" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-semibold text-gray-500 hover:text-opportuni-rosa transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        {/* Placeholder for visual alignment */}
        <div style={{ width: 140 }} />
      </nav>

      <main className="pt-[90px]">
        {/* ========== HERO ========== */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden px-4">
          {/* Floating sparkles */}
          <span className="absolute top-[15%] right-[20%] text-[32px] animate-float z-10 pointer-events-none" style={{ color: "var(--nar)" }}>✦</span>
          <span className="absolute top-[60%] right-[10%] text-[18px] animate-float animation-delay-200 z-10 pointer-events-none" style={{ color: "var(--lila)" }}>✦</span>
          <span className="absolute top-[80%] left-[15%] text-[22px] animate-float animation-delay-600 z-10 pointer-events-none" style={{ color: "var(--rosa)" }}>✦</span>

          <div className="relative z-10 max-w-[1140px] mx-auto w-full grid md:grid-cols-[1.15fr_0.85fr] gap-4 items-center">
            {/* Left */}
            <div className="animate-slide-up" style={{ padding: "clamp(32px,5vw,52px) clamp(32px,5vw,52px) clamp(32px,5vw,52px) 0" }}>
              <div className="pill mb-6">
                <span className="dot" />
                +200 NUEVAS CADA SEMANA
              </div>

              <h1 className="text-4xl md:text-[clamp(36px,4.5vw,56px)] font-black leading-[1.1] mb-5">
                Becas, vacantes y programas<br/>
                <span className="font-playfair italic" style={{ color: "var(--rosa)" }}>
                  que nadie te había contado.
                </span>
              </h1>

              <p className="text-base md:text-lg text-gray-500 mb-8 max-w-lg leading-relaxed">
                Oportunidades verificadas para jóvenes en LATAM.
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Link href="/convocatorias" className="btn-primary">Ver convocatorias ✦</Link>
                <div className="relative">
                  <button onClick={() => setShowDrop(!showDrop)} className="btn-secondary">
                    Unirme al grupo ▾
                  </button>
                  {showDrop && (
                    <div className="absolute top-full mt-2 left-0 bento p-3 space-y-2 min-w-[200px] z-20">
                      <a href="https://chat.whatsapp.com/Iz07jRuw4WDE0uZgpvdGGm" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl hover:bg-opportuni-cream transition-colors">
                        <span>🇲🇽</span> <span className="font-bold text-sm">México</span> <span className="text-xs text-gray-400 ml-auto">+8K</span>
                      </a>
                      <a href="https://chat.whatsapp.com/JsVEfmT8Iiv1R1fZWVqqdf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl hover:bg-opportuni-cream transition-colors">
                        <span>🇨🇴</span> <span className="font-bold text-sm">Colombia</span> <span className="text-xs text-gray-400 ml-auto">+1.5K</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right — Badge Panel Art */}
            <div className="hidden md:block animate-slide-in-right">
              <div className="bento p-5 transition-all hover:translate-x-[-3px] hover:translate-y-[-3px]" style={{ background: "var(--dark)", boxShadow: "6px 6px 0 var(--rosa)" }}>
                <svg viewBox="0 0 340 300" fill="none" className="w-full">
                  <defs><pattern id="scallop" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 20C10 20 10 10 20 10C30 10 30 20 40 20" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5"/></pattern></defs>
                  <rect width="340" height="300" fill="var(--dark)"/>
                  <rect width="340" height="300" fill="url(#scallop)"/>
                  {/* BECAS sticker */}
                  <g transform="translate(15,15) rotate(-5)"><ellipse cx="52" cy="35" rx="52" ry="35" fill="var(--rosa)"/><text x="52" y="32" textAnchor="middle" fontFamily="Gabarito" fontSize="15" fontWeight="900" fill="#fff" letterSpacing="1">BECAS</text><text x="52" y="48" textAnchor="middle" fontFamily="Playfair Display" fontSize="10" fill="rgba(255,255,255,.7)" fontStyle="italic">latam</text></g>
                  {/* GOOGLE pill */}
                  <g transform="translate(140,5) rotate(3)"><rect width="130" height="48" rx="24" fill="var(--nar)"/><text x="65" y="31" textAnchor="middle" fontFamily="Gabarito" fontSize="18" fontWeight="900" fill="var(--dark)" letterSpacing="1">GOOGLE</text></g>
                  {/* +8K circle */}
                  <g transform="translate(215,68)"><circle cx="44" cy="44" r="42" fill="var(--teal)"/><text x="44" y="38" textAnchor="middle" fontFamily="Gabarito" fontSize="11" fontWeight="900" fill="#fff">+8,000</text><text x="44" y="54" textAnchor="middle" fontFamily="Playfair Display" fontSize="9" fill="rgba(255,255,255,.7)" fontStyle="italic">jóvenes</text></g>
                  {/* MX · COL half-circle */}
                  <g transform="translate(8,105)"><path d="M0 45A45 45 0 0 1 90 45Z" fill="var(--lila)"/><text x="45" y="38" textAnchor="middle" fontFamily="Gabarito" fontSize="10" fontWeight="900" fill="#fff" letterSpacing="1">MX · COL</text></g>
                  {/* Fox blob */}
                  <g transform="translate(105,100)"><ellipse cx="42" cy="38" rx="42" ry="38" fill="var(--rosa)" opacity=".15"/><text x="42" y="44" textAnchor="middle" fontSize="36">🦊</text></g>
                  {/* VACANTES pill */}
                  <g transform="translate(190,140) rotate(4)"><rect width="120" height="50" rx="25" fill="var(--nar)" opacity=".9"/><text x="60" y="25" textAnchor="middle" fontFamily="Playfair Display" fontSize="8" fill="var(--dark)" fontStyle="italic" opacity=".6">verified</text><text x="60" y="40" textAnchor="middle" fontFamily="Gabarito" fontSize="13" fontWeight="900" fill="var(--dark)">VACANTES</text></g>
                  {/* Smiley */}
                  <g transform="translate(20,190) rotate(6)"><circle cx="32" cy="32" r="30" fill="var(--nar)"/><circle cx="22" cy="26" r="4" fill="var(--dark)"/><circle cx="42" cy="26" r="4" fill="var(--dark)"/><path d="M18 38C22 46 42 46 46 38" stroke="var(--dark)" strokeWidth="3" fill="none" strokeLinecap="round"/></g>
                  {/* STELLAR pill */}
                  <g transform="translate(100,210) rotate(-3)"><rect width="108" height="42" rx="21" fill="var(--lila)"/><text x="54" y="27" textAnchor="middle" fontFamily="Gabarito" fontSize="14" fontWeight="900" fill="#fff" letterSpacing="2">STELLAR</text></g>
                  {/* WEB3 blob */}
                  <g transform="translate(232,215)"><ellipse cx="32" cy="28" rx="32" ry="28" fill="var(--teal)"/><text x="32" y="34" textAnchor="middle" fontFamily="Gabarito" fontSize="11" fontWeight="900" fill="var(--dark)">WEB3</text></g>
                  {/* Sparkles */}
                  <g fill="var(--nar)"><path d="M285 20l3-8 3 8 8 3-8 3-3 8-3-8-8-3z"/><path d="M180 185l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="var(--rosa)"/><path d="M310 260l2-6 2 6 6 2-6 2-2 6-2-6-6-2z" fill="#fff" opacity=".3"/></g>
                  <g fill="#fff" opacity=".2"><path d="M130 170l2-5 2 5 5 2-5 2-2 5-2-5-5-2z"/><path d="M70 160l1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5z"/></g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ========== SCALLOP (hero → dark) ========== */}
        <svg viewBox="0 0 1200 30" fill="var(--dark)" preserveAspectRatio="none" style={{ display: "block", width: "100%" }}>
          <path d="M0 30C50 30 50 0 100 0C150 0 150 30 200 30C250 30 250 0 300 0C350 0 350 30 400 30C450 30 450 0 500 0C550 0 550 30 600 30C650 30 650 0 700 0C750 0 750 30 800 30C850 30 850 0 900 0C950 0 950 30 1000 30C1050 30 1050 0 1100 0C1150 0 1150 30 1200 30V0H0Z" />
        </svg>

        {/* ========== MARQUEE - TWO ROWS ========== */}
        <section style={{ background: "var(--dark)", overflow: "hidden", padding: "16px 0" }}>
          {/* Row 1: Company logos */}
          <p className="text-center text-xs text-white/40 mb-3 font-mono uppercase tracking-wider">Oportunidades de empresas como</p>
          <div className="flex animate-scroll whitespace-nowrap mb-4">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-10 shrink-0 px-5">
                {["ONU", "NUBANK", "L'ORÉAL", "TEC DE MONTERREY", "STELLAR", "MCKINSEY", "AMAZON", "SANTANDER", "MICROSOFT"].map((company) => (
                  <span key={`${company}-${idx}`} className="flex items-center gap-3">
                    <span style={{ color: "var(--teal)" }}>●</span>
                    <span className="font-gabarito font-bold text-white/70 text-sm uppercase tracking-wide">{company}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
          {/* Row 2: Opportunities carousel */}
          <div className="flex animate-scroll-reverse whitespace-nowrap">
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-6 shrink-0 px-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "var(--rosa)", color: "white" }}>
                  BECA <span className="opacity-70">Santander — Maestría en Europa 🇪🇺</span>
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "var(--nar)", color: "var(--dark)" }}>
                  VACANTE <span className="opacity-70">Meta Junior PM — Remoto LATAM 🎨</span>
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "var(--teal)", color: "white" }}>
                  CURSO <span className="opacity-70">McKinsey Forward — Gratis, 8 semanas 🎓</span>
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "white", color: "var(--dark)" }}>
                  BECA <span className="opacity-70">L&apos;Oréal UNESCO — Mujeres en Ciencia ⚔️</span>
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "var(--lila)", color: "white" }}>
                  PROGRAMA <span className="opacity-70">Google Career Certificates 💻</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ========== SCALLOP (dark → cream) ========== */}
        <svg viewBox="0 0 1200 30" fill="var(--dark)" preserveAspectRatio="none" style={{ display: "block", width: "100%", transform: "scaleY(-1)" }}>
          <path d="M0 30C50 30 50 0 100 0C150 0 150 30 200 30C250 30 250 0 300 0C350 0 350 30 400 30C450 30 450 0 500 0C550 0 550 30 600 30C650 30 650 0 700 0C750 0 750 30 800 30C850 30 850 0 900 0C950 0 950 30 1000 30C1050 30 1050 0 1100 0C1150 0 1150 30 1200 30V0H0Z" />
        </svg>

        {/* ========== COMO FUNCIONA - 4 PASOS ========== */}
        <section id="como" className="py-20 px-4" style={{ background: "var(--cream)" }}>
          <div className="max-w-[1140px] mx-auto">
            <div className="text-center mb-14">
              <span className="text-2xl" style={{ color: "var(--lila)" }}>★</span>
              <h2 className="text-3xl md:text-4xl font-black mt-2">
                Cuatro pasos. <span className="font-playfair italic" style={{ color: "var(--rosa)" }}>Así de fácil.</span> <span className="animate-twinkle inline-block" style={{ color: "var(--nar)" }}>✦</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {/* Paso 1 - Únete al grupo */}
              <div className="bento p-6 text-center">
                <div className="relative w-[60px] h-[60px] mb-4 mx-auto">
                  <svg viewBox="0 0 60 60" className="w-full h-full">
                    <circle cx="30" cy="30" r="28" fill="var(--rosa)" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-gabarito font-black text-xl">1</span>
                </div>
                <h3 className="text-lg font-black mb-2">Únete al grupo</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">Selecciona tu país y entra al grupo principal de WhatsApp.</p>
                <div className="relative">
                  <button 
                    onClick={() => setShowStep1Drop(!showStep1Drop)}
                    className="w-full py-3 px-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 border-2 transition-all hover:translate-y-[-2px]"
                    style={{ background: "var(--rosa)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)" }}
                  >
                    Unirme al grupo {showStep1Drop ? "▲" : "▼"}
                  </button>
                  {showStep1Drop && (
                    <div className="mt-3 border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
                      <a href="https://chat.whatsapp.com/LqwA94ukn1O2laee8WP9tN" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <span className="text-xl">🇲🇽</span>
                        <span className="font-bold text-sm">México</span>
                        <span className="text-xs ml-auto" style={{ color: "var(--rosa)" }}>+8K</span>
                      </a>
                      <a href="https://chat.whatsapp.com/JsVEfmT8Iiv1R1fZWVqqdf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        <span className="text-xl">🇨🇴</span>
                        <span className="font-bold text-sm">Colombia</span>
                        <span className="text-xs ml-auto" style={{ color: "var(--rosa)" }}>+1.5K</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Paso 2 - Elige tu carrera */}
              <div className="bento p-6 text-center">
                <div className="relative w-[60px] h-[60px] mb-4 mx-auto">
                  <svg viewBox="0 0 60 60" className="w-full h-full">
                    <circle cx="30" cy="30" r="28" fill="var(--lila)" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-gabarito font-black text-xl">2</span>
                </div>
                <h3 className="text-lg font-black mb-2">Elige tu carrera</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">Ya adentro → elige el subgrupo de tu área. Así solo recibes las oportunidades que te importan.</p>
                <div className="relative">
                  <button 
                    onClick={() => setShowStep2Drop(!showStep2Drop)}
                    className="w-full py-3 px-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 border-2 transition-all hover:translate-y-[-2px]"
                    style={{ background: "var(--lila)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)" }}
                  >
                    Elegir mi área {showStep2Drop ? "▲" : "▼"}
                  </button>
                  {showStep2Drop && (
                    <div className="mt-3 border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
                      <a href="https://chat.whatsapp.com/CSy5PqWyXuNGca7gLKyhWe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <span>⚙️</span>
                        <span className="font-bold text-sm">Ingeniería</span>
                      </a>
                      <a href="https://chat.whatsapp.com/Fh0QdKA6wUbJ6kKdCpfZF4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <span>💼</span>
                        <span className="font-bold text-sm">Negocios</span>
                      </a>
                      <a href="https://chat.whatsapp.com/DupdfJig8NeHAE1Mz451vB" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <span>🎨</span>
                        <span className="font-bold text-sm">Estudios Creativos</span>
                      </a>
                      <a href="https://chat.whatsapp.com/Dl7FbQfRjQ6LLZf8SFSb9d" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <span>🌍</span>
                        <span className="font-bold text-sm">Ciencias Sociales</span>
                      </a>
                      <a href="https://chat.whatsapp.com/Kvh6DnT3LcJH02qFa1VjER" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        <span>⛏️</span>
                        <span className="font-bold text-sm">Web3</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Paso 3 - Busca algo específico */}
              <div className="bento p-6 text-center">
                <div className="relative w-[60px] h-[60px] mb-4 mx-auto">
                  <svg viewBox="0 0 60 60" className="w-full h-full">
                    <circle cx="30" cy="30" r="28" fill="var(--teal)" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-gabarito font-black text-xl">3</span>
                </div>
                <h3 className="text-lg font-black mb-2">Busca algo específico</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">Escríbele al chat, dile qué buscas y te responde al momento con opciones personalizadas.</p>
                <a 
                  href="https://wa.me/522205414251" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all hover:translate-y-[-2px] text-white"
                  style={{ background: "var(--teal)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)" }}
                >
                  💬 Abrir chat
                </a>
              </div>

              {/* Paso 4 - Comparte con un amigo */}
              <div className="bento p-6 text-center">
                <div className="relative w-[60px] h-[60px] mb-4 mx-auto">
                  <svg viewBox="0 0 60 60" className="w-full h-full">
                    <circle cx="30" cy="30" r="28" fill="var(--nar)" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-gabarito font-black text-xl">4</span>
                </div>
                <h3 className="text-lg font-black mb-2">Comparte con un amigo</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">¿Ya lo viviste? Pásalo a alguien que lo necesite. Las mejores oportunidades se comparten.</p>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="w-full py-3 px-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 border-2 transition-all hover:translate-y-[-2px]"
                  style={{ background: "var(--nar)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)" }}
                >
                  Comparte con un amigo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========== SHARE MODAL ========== */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
            <div className="bento p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
              {/* Star icon */}
              <div className="mb-4">
                <span className="text-4xl" style={{ color: "var(--rosa)" }}>★</span>
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-black mb-2">Invita a quien quieras</h3>
              <p className="text-sm text-gray-500 mb-6">Hay una oportunidad aquí que puede<br/>cambiarle la vida. 🎯</p>
              
              {/* Link display */}
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "var(--cream2)" }}>
                <span>🔗</span>
                <span className="text-sm font-mono">opportuni.vercel.app</span>
              </div>
              
              {/* Copy button */}
              <button 
                onClick={() => navigator.clipboard.writeText("https://opportuni.vercel.app")}
                className="w-full py-3 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 mb-3 border-2 transition-all hover:translate-y-[-2px]"
                style={{ background: "var(--nar)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)", color: "var(--dark)" }}
              >
                📋 Copiar link
              </button>
              
              {/* WhatsApp button */}
              <button 
                onClick={() => window.open("https://wa.me/?text=¡Mira esta comunidad de oportunidades! https://opportuni.vercel.app", "_blank")}
                className="w-full py-3 px-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 mb-4 border-2 transition-all hover:translate-y-[-2px]"
                style={{ background: "#25D366", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar por WhatsApp
              </button>
              
              {/* Close link */}
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* ========== SERVICIOS ========== */}
        <section id="servicios" className="py-20 px-4" style={{ background: "var(--cream2)" }}>
          <div className="max-w-[1140px] mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-3">
              Servicios que abren puertas <span className="animate-twinkle inline-block" style={{ color: "var(--nar)" }}>✦</span>
            </h2>
            <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">
              Porque buscar oportunidades no debería ser tan difícil. Nosotros te ayudamos.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Review de CV */}
              <div className="bento p-0 overflow-hidden block w-full text-left" style={{ opacity: 0.65 }} aria-disabled="true">
                <div className="p-8 flex items-center justify-center" style={{ background: "var(--rosa)", minHeight: "180px" }}>
                  <svg viewBox="0 0 120 140" fill="none" className="w-24">
                    {/* Corona */}
                    <g transform="translate(25, 0)">
                      <path d="M5 30L20 10L35 25L50 10L65 30L60 35H10L5 30Z" fill="#FFD93D" stroke="#1a1a2e" strokeWidth="2"/>
                      <circle cx="20" cy="10" r="4" fill="#FFD93D" stroke="#1a1a2e" strokeWidth="2"/>
                      <circle cx="35" cy="5" r="4" fill="#FFD93D" stroke="#1a1a2e" strokeWidth="2"/>
                      <circle cx="50" cy="10" r="4" fill="#FFD93D" stroke="#1a1a2e" strokeWidth="2"/>
                    </g>
                    {/* Documento */}
                    <rect x="20" y="35" width="80" height="100" rx="8" fill="white" stroke="#1a1a2e" strokeWidth="3"/>
                    {/* Líneas del documento */}
                    <line x1="35" y1="55" x2="85" y2="55" stroke="#e0e0e0" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="35" y1="70" x2="85" y2="70" stroke="#e0e0e0" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="35" y1="85" x2="70" y2="85" stroke="#e0e0e0" strokeWidth="3" strokeLinecap="round"/>
                    {/* Check verde */}
                    <circle cx="60" cy="110" r="15" fill="#0ec4a9" stroke="#1a1a2e" strokeWidth="2"/>
                    <path d="M52 110L57 115L68 104" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black mb-2">Review de CV</h3>
                  <p className="text-sm text-gray-500 mb-4">Tu CV optimizado para destacar donde importa.</p>
                  <div className="flex gap-2 mb-4">
                    <span className="badge badge-rosa">PDF</span>
                    <span className="badge badge-rosa">Feedback</span>
                  </div>
                  <span className="w-full py-3 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 border-2" style={{ background: "var(--cream2)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)", color: "var(--dark)" }}>
                    Próximamente ✦
                  </span>
                </div>
              </div>

              {/* Asesoría */}
              <div className="bento p-0 overflow-hidden block w-full text-left" style={{ opacity: 0.65 }} aria-disabled="true">
                <div className="p-8 flex items-center justify-center" style={{ background: "var(--cream2)", minHeight: "180px" }}>
                  <svg viewBox="0 0 140 120" fill="none" className="w-28">
                    {/* Burbuja teal (arriba izq) */}
                    <ellipse cx="45" cy="35" rx="35" ry="28" fill="#0ec4a9" stroke="#1a1a2e" strokeWidth="3"/>
                    <circle cx="20" cy="55" r="6" fill="#0ec4a9" stroke="#1a1a2e" strokeWidth="2"/>
                    <circle cx="12" cy="68" r="4" fill="#0ec4a9" stroke="#1a1a2e" strokeWidth="2"/>
                    {/* Burbuja rosa (abajo der) */}
                    <ellipse cx="95" cy="75" rx="35" ry="28" fill="var(--rosa)" stroke="#1a1a2e" strokeWidth="3"/>
                    <circle cx="120" cy="55" r="6" fill="var(--rosa)" stroke="#1a1a2e" strokeWidth="2"/>
                    <circle cx="128" cy="42" r="4" fill="var(--rosa)" stroke="#1a1a2e" strokeWidth="2"/>
                    {/* Rayos */}
                    <g transform="translate(60, 40)">
                      <path d="M10 0L12 8L20 5L14 12L22 18L12 15L10 25L8 15L-2 18L6 12L0 5L8 8Z" fill="#7c5cfc" stroke="#1a1a2e" strokeWidth="1.5"/>
                    </g>
                    <g transform="translate(75, 55) scale(0.7)">
                      <path d="M10 0L12 8L20 5L14 12L22 18L12 15L10 25L8 15L-2 18L6 12L0 5L8 8Z" fill="#7c5cfc" stroke="#1a1a2e" strokeWidth="1.5"/>
                    </g>
                  </svg>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black mb-2">Asesoría 1:1</h3>
                  <p className="text-sm text-gray-500 mb-4">Sesión personalizada para armar tu estrategia de carrera.</p>
                  <div className="flex gap-2 mb-4">
                    <span className="badge badge-naranja">Mentores</span>
                    <span className="badge badge-naranja">30 min</span>
                  </div>
                  <span className="w-full py-3 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 border-2" style={{ background: "var(--cream2)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)", color: "var(--dark)" }}>
                    Próximamente ✦
                  </span>
                </div>
              </div>

              {/* Chat */}
              <a href="https://wa.me/522205414251?text=Hola!" target="_blank" rel="noopener noreferrer" className="bento p-0 overflow-hidden group cursor-pointer block">
                <div className="p-8 flex items-center justify-center" style={{ background: "var(--teal)", minHeight: "180px" }}>
                  <svg viewBox="0 0 100 120" fill="none" className="w-20">
                    {/* Antenas */}
                    <line x1="30" y1="25" x2="30" y2="10" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="30" cy="8" r="6" fill="var(--rosa)" stroke="#1a1a2e" strokeWidth="2"/>
                    <line x1="70" y1="25" x2="70" y2="10" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="70" cy="8" r="6" fill="var(--rosa)" stroke="#1a1a2e" strokeWidth="2"/>
                    {/* Cabeza robot */}
                    <rect x="15" y="25" width="70" height="70" rx="12" fill="white" stroke="#1a1a2e" strokeWidth="3"/>
                    {/* Ojos */}
                    <circle cx="38" cy="55" r="10" fill="var(--nar)" stroke="#1a1a2e" strokeWidth="2"/>
                    <circle cx="62" cy="55" r="10" fill="var(--nar)" stroke="#1a1a2e" strokeWidth="2"/>
                    <circle cx="40" cy="53" r="3" fill="white"/>
                    <circle cx="64" cy="53" r="3" fill="white"/>
                    {/* Boca sonriente */}
                    <path d="M38 75C42 82 58 82 62 75" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    {/* Orejas/lados */}
                    <rect x="5" y="45" width="10" height="25" rx="4" fill="white" stroke="#1a1a2e" strokeWidth="2"/>
                    <rect x="85" y="45" width="10" height="25" rx="4" fill="white" stroke="#1a1a2e" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black mb-2">Chat con Opportuni</h3>
                  <p className="text-sm text-gray-500 mb-4">Pregunta lo que sea. Becas, vacantes, programas en segundos.</p>
                  <div className="flex gap-2 mb-4">
                    <span className="badge badge-teal">Búsqueda web</span>
                    <span className="badge badge-teal">LATAM</span>
                  </div>
                  <span className="w-full py-3 px-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 border-2" style={{ background: "var(--teal)", borderColor: "var(--dark)", boxShadow: "3px 3px 0 var(--dark)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Hablar por WhatsApp
                  </span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ========== TESTIMONIOS ========== */}
        <section id="testimonios" className="py-20 px-4" style={{ background: "var(--cream)" }}>
          <div className="max-w-[1140px] mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-14">
              Historias que <span className="font-playfair italic" style={{ color: "var(--rosa)" }}>nos mueven.</span> <span className="animate-twinkle inline-block" style={{ color: "var(--nar)" }}>✦</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonios.map((t) => (
                <div key={t.nombre} className="bento p-7">
                  <div className="flex gap-1 mb-4" style={{ color: "var(--nar)" }}>
                    {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
                  </div>
                  <p className="font-playfair italic text-base leading-relaxed mb-6 text-gray-700">
                    &ldquo;{t.texto}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
                      style={{ background: t.color, borderColor: "var(--dark)", boxShadow: "2px 2px 0 var(--dark)" }}
                    >
                      {t.nombre[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.nombre}</p>
                      <p className="text-xs text-gray-400">{t.rol}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Flechas de navegación */}
            <div className="flex justify-center gap-4 mt-10">
              <button className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg transition-all hover:translate-y-[-2px]" style={{ borderColor: "var(--dark)", boxShadow: "2px 2px 0 var(--dark)", background: "white" }}>
                ←
              </button>
              <button className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg transition-all hover:translate-y-[-2px]" style={{ borderColor: "var(--dark)", boxShadow: "2px 2px 0 var(--dark)", background: "white" }}>
                →
              </button>
            </div>
          </div>
        </section>

        {/* ========== FAQ ========== */}
        <section id="faq" className="py-20 px-4" style={{ background: "var(--cream2)" }}>
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
              Preguntas<br/>
              <span className="font-playfair italic" style={{ color: "var(--rosa)" }}>frecuentes.</span>{" "}
              <span className="animate-twinkle inline-block" style={{ color: "var(--nar)" }}>✦</span>
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bento overflow-hidden"
                >
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-6 text-left flex justify-between items-center gap-4"
                  >
                    <span className="font-bold text-base">{faq.question}</span>
                    <span className="text-xl shrink-0 font-bold" style={{ color: "var(--rosa)" }}>
                      {openFaq === idx ? "✕" : "+"}
                    </span>
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6 text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="cta-section px-4">
          {/* Floating sparkles */}
          <span className="absolute text-[32px] pointer-events-none animate-float" style={{ top: "15%", left: "8%", color: "var(--dark)" }}>✦</span>
          <span className="absolute text-[18px] pointer-events-none animate-float" style={{ top: "25%", right: "12%", color: "var(--nar)", animationDelay: "0.5s" }}>✦</span>
          <span className="absolute text-[24px] pointer-events-none animate-float" style={{ bottom: "30%", left: "15%", color: "var(--nar)", animationDelay: "1s" }}>✦</span>
          <span className="absolute text-[20px] pointer-events-none animate-float" style={{ bottom: "20%", right: "20%", color: "var(--dark)", animationDelay: "1.5s" }}>✦</span>

          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-8">
              <span style={{ color: "var(--dark)" }}>¿Listo para encontrar</span><br/>
              <span className="font-playfair italic text-white">tu siguiente oportunidad?</span>
            </h2>
            <a
              href="https://wa.me/522205414251"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 rounded-full font-bold text-base border-2 transition-all hover:translate-y-[-2px]"
              style={{ background: "var(--dark)", color: "white", borderColor: "var(--dark)", boxShadow: "4px 4px 0 rgba(0,0,0,0.2)" }}
            >
              Buscar oportunidades ✦
            </a>
          </div>
        </section>

        {/* ========== SCALLOP (orange CTA → dark footer) ========== */}
        <div style={{ marginTop: -2 }}>
          <svg viewBox="0 0 1200 30" fill="var(--dark)" preserveAspectRatio="none" style={{ display: "block", width: "100%" }}>
            <path d="M0 0C50 0 50 30 100 30C150 30 150 0 200 0C250 0 250 30 300 30C350 30 350 0 400 0C450 0 450 30 500 30C550 30 550 0 600 0C650 0 650 30 700 30C750 30 750 0 800 0C850 0 850 30 900 30C950 30 950 0 1000 0C1050 0 1050 30 1100 30C1150 30 1150 0 1200 0V30H0Z" />
          </svg>
        </div>

        {/* ========== FOOTER ========== */}
        <footer style={{ background: "var(--dark)" }} className="py-14 px-4 text-white">
          <div className="max-w-[1140px] mx-auto grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
            <div>
              <div className="flex items-center gap-[10px] mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 30, width: "auto", filter: "brightness(10)" }} />
                <span className="font-gabarito text-xl font-black">Opportuni</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs">Conectamos jóvenes con becas, vacantes, retos y oportunidades en toda LATAM. ✦</p>
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase mb-4" style={{ color: "var(--nar)" }}>Producto</p>
              <div className="space-y-2">
                <a href="#como" className="block text-sm text-gray-500 hover:text-white transition-colors">Cómo funciona</a>
                <a href="#servicios" className="block text-sm text-gray-500 hover:text-white transition-colors">Servicios</a>
                <a href="#testimonios" className="block text-sm text-gray-500 hover:text-white transition-colors">Historias</a>
                <a href="#faq" className="block text-sm text-gray-500 hover:text-white transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase mb-4" style={{ color: "var(--nar)" }}>Comunidad</p>
              <div className="space-y-2">
                <a href="https://chat.whatsapp.com/LqwA94ukn1O2laee8WP9tN" target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-500 hover:text-white transition-colors">México</a>
                <a href="https://chat.whatsapp.com/JsVEfmT8Iiv1R1fZWVqqdf" target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-500 hover:text-white transition-colors">Colombia</a>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase mb-4" style={{ color: "var(--nar)" }}>Síguenos</p>
              <div className="space-y-3">
                <a href="https://www.instagram.com/opportuni__mx/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-50"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </a>
                <a href="https://www.linkedin.com/company/opportunn/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-50"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
          <div className="max-w-[1140px] mx-auto mt-12 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} Opportuni. Hecho con <span className="text-white">♥</span> en LATAM.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
