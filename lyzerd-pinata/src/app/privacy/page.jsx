import React from 'react';

/**
 * LYZERD GLOBAL PRIVACY PROTOCOL - VERSION 4.0
 * Compliance: Ley 81 (Panama), GDPR (EU), CCPA (USA)
 * Model: Independent Developer / P2P Software
 */

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-black text-gray-400 p-4 md:p-20 font-mono text-xs leading-relaxed selection:bg-blue-900 selection:text-white">
      <div className="max-w-5xl mx-auto border border-gray-800 bg-gray-950 p-8 shadow-2xl">
        
        {/* HEADER DE CUMPLIMIENTO GLOBAL */}
        <header className="border-b border-gray-700 pb-10 mb-10">
          <h1 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">
            Protocolo Global de Privacidad y <br />
            <span className="text-blue-600">Tratamiento de Datos LYZERD</span>
          </h1>
          <div className="bg-blue-950/10 border border-blue-900 p-6 text-blue-200">
            <p className="font-bold mb-2 uppercase italic tracking-widest text-[10px]">
              Estatus: Cumplimiento Multi-Jurisdiccional (PA-EU-US)
            </p>
            <p className="text-[11px]">
              Este documento establece el estándar de transparencia para el tratamiento de datos de usuarios internacionales. 
              Al interactuar con Lyzerd, usted acepta el procesamiento de datos técnicos bajo los principios de 
              <strong> Minimización, Finalidad y Lealtad</strong>.
            </p>
          </div>
        </header>

        {/* NAVEGACIÓN RÁPIDA */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-12 text-[9px] uppercase font-bold text-gray-600">
          <span className="border border-gray-800 p-2">1. Responsabilidad</span>
          <span className="border border-gray-800 p-2">2. Datos On-Chain</span>
          <span className="border border-gray-800 p-2">3. Sub-procesadores</span>
          <span className="border border-gray-800 p-2">4. Derechos ARCO+</span>
          <span className="border border-gray-800 p-2">5. Retención</span>
        </div>

        <div className="space-y-12 text-justify">

          {/* 1. EL RESPONSABLE (VÍNCULO P2P) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">1. Identidad del Responsable</h2>
            <p className="mb-4">
              Lyzerd no es una entidad corporativa. El tratamiento de datos es gestionado por un <strong>colectivo de desarrollo independiente</strong> con base operativa en la República de Panamá.
            </p>
            <div className="bg-gray-900/50 p-4 border border-gray-800">
              <p className="text-[11px] leading-relaxed">
                Debido a la naturaleza descentralizada del proyecto, no existe un "Oficial de Protección de Datos" físico, sino un canal de resolución técnica: 
                <span className="text-blue-400 font-bold ml-2">privacy@lyzerd.io</span>. 
                Cualquier solicitud será procesada bajo los tiempos legales de la Ley 81 (Panamá) y el estándar GDPR (UE).
              </p>
            </div>
          </section>

          <hr className="border-gray-800" />

          {/* 2. CATEGORÍAS DE DATOS (EL FILTRO) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">2. Categorías de Datos Procesados</h2>
            <p className="mb-6">Operamos bajo el principio de <strong>"Privacidad desde el Diseño"</strong>. Solo procesamos lo que el código requiere para ejecutarse:</p>
            
            <table className="w-full border-collapse border border-gray-800 text-[10px]">
              <thead>
                <tr className="bg-gray-900 text-white uppercase">
                  <th className="border border-gray-800 p-2">Categoría</th>
                  <th className="border border-gray-800 p-2">Ejemplo de Datos</th>
                  <th className="border border-gray-800 p-2">Base Legal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-800 p-2 font-bold">Datos Técnicos</td>
                  <td className="border border-gray-800 p-2">IP (anonimizada), User-Agent, Huella digital del navegador.</td>
                  <td className="border border-gray-800 p-2 italic">Interés Legítimo (Seguridad Anti-DDoS)</td>
                </tr>
                <tr>
                  <td className="border border-gray-800 p-2 font-bold">Datos On-Chain</td>
                  <td className="border border-gray-800 p-2">Wallet Address pública, historial de transacciones en la red Solana.</td>
                  <td className="border border-gray-800 p-2 italic">Ejecución de Función del Software</td>
                </tr>
                <tr>
                  <td className="border border-gray-800 p-2 font-bold">Datos de IA</td>
                  <td className="border border-gray-800 p-2">Prompts de consulta y feedback técnico sobre el análisis.</td>
                  <td className="border border-gray-800 p-2 italic">Consentimiento del Usuario</td>
                </tr>
              </tbody>
            </table>
          </section>

          <hr className="border-gray-800" />

          {/* 3. DATOS EN LA BLOCKCHAIN (EL AVISO CRÍTICO) */}
          <section className="bg-blue-950/5 border border-blue-900/20 p-6">
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">3. Aviso Especial: Inmutabilidad Blockchain</h2>
            <p className="mb-4">
              Lyzerd procesa datos que son públicos por naturaleza en el Ledger de Solana. El Usuario debe entender que:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-300">
              <li>El "Derecho al Olvido" (Cancelación) no es aplicable a los datos ya registrados en la blockchain.</li>
              <li>Lyzerd no tiene control sobre la indexación que terceros hagan de las transacciones realizadas hacia nuestras wallets de pago.</li>
              <li>Al conectar su wallet (Phantom), usted autoriza la lectura de su historial público para fines de análisis técnico.</li>
            </ul>
          </section>

          <hr className="border-gray-800" />

          {/* 4. SUB-PROCESADORES INTERNACIONALES */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">4. Transferencia Internacional y Sub-procesadores</h2>
            <p className="mb-4">Para usuarios fuera de Panamá, sus datos pueden ser procesados en servidores ubicados en EE. UU. o la UE a través de:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border border-gray-800 rounded bg-black">
                <h4 className="text-blue-500 font-bold text-[9px] uppercase">A. Infraestructura Cloud</h4>
                <p className="text-[9px]">Vercel / Cloudflare (Gestión de tráfico y hosting).</p>
              </div>
              <div className="p-3 border border-gray-800 rounded bg-black">
                <h4 className="text-blue-500 font-bold text-[9px] uppercase">B. Motores de IA</h4>
                <p className="text-[9px]">Groq / OpenAI APIs (Procesamiento de lenguaje natural).</p>
              </div>
              <div className="p-3 border border-gray-800 rounded bg-black">
                <h4 className="text-blue-500 font-bold text-[9px] uppercase">C. Oráculos de Datos</h4>
                <p className="text-[9px]">Moralis / CoinGecko (Fuentes de datos blockchain).</p>
              </div>
            </div>
            <p className="mt-4 italic text-[10px]">
              *Todos los sub-procesadores han sido seleccionados por cumplir con el Marco de Privacidad de Datos (Data Privacy Framework).
            </p>
          </section>

          <hr className="border-gray-800" />

          {/* 5. DERECHOS GLOBALES (GDPR/LEY 81/CCPA) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">5. Ejercicio de Derechos del Titular</h2>
            <p className="mb-4">Independientemente de su ubicación, Lyzerd garantiza los siguientes derechos:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 border border-gray-800 bg-gray-900/30">
                <div className="text-blue-600 font-black text-xl">A</div>
                <div>
                  <p className="text-white font-bold uppercase text-[10px]">Acceso y Portabilidad</p>
                  <p className="text-[9px]">Derecho a conocer qué datos técnicos tenemos y solicitar una copia en formato legible.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border border-gray-800 bg-gray-900/30">
                <div className="text-blue-600 font-black text-xl">O</div>
                <div>
                  <p className="text-white font-bold uppercase text-[10px]">Oposición y Limitación</p>
                  <p className="text-[9px]">Derecho a restringir el procesamiento de sus consultas en nuestros modelos de aprendizaje.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border border-gray-800 bg-gray-900/30">
                <div className="text-blue-600 font-black text-xl">C</div>
                <div>
                  <p className="text-white font-bold uppercase text-[10px]">Cancelación (Supresión)</p>
                  <p className="text-[9px]">Eliminación de cualquier log asociado a su IP o Wallet en nuestros servidores internos.</p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-gray-800" />

          {/* 6. SEGURIDAD Y RETENCIÓN */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">6. Protocolos de Seguridad y Retención</h2>
            <p className="mb-4">
              Lyzerd no almacena datos de por vida. Nuestra política de purga es terminal:
            </p>
            <ul className="list-none ml-4 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> 
                <strong>Logs de Servidor:</strong> Eliminación automática cada 30 días.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> 
                <strong>Cache de Consultas:</strong> Persistencia máxima de 90 días para optimización de IA.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> 
                <strong>Seguridad:</strong> Implementamos cifrado TLS 1.3 y protección contra inyecciones SQL en toda la capa de datos.
              </li>
            </ul>
          </section>

          <hr className="border-gray-800" />

          {/* 7. JURISDICCIÓN Y AUTORIDAD DE CONTROL */}
          <section className="pb-20">
            <h2 className="text-white font-bold mb-4 border-l-4 border-blue-600 pl-3 uppercase">7. Autoridad de Supervisión</h2>
            <p>
              Cualquier reclamación sobre el tratamiento de sus datos puede ser dirigida a la <strong>ANTAI</strong> (Panamá) 
              o a la autoridad de protección de datos de su país de residencia. No obstante, Lyzerd se compromete a 
              resolver cualquier disputa de forma directa y técnica.
            </p>
          </section>

        </div>

        {/* FOOTER DE CERTIFICACIÓN */}
        <footer className="border-t border-gray-800 pt-10 mt-10 text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-8 opacity-50 grayscale contrast-125">
             <div className="text-[8px] font-bold border border-gray-700 px-2 py-1">GDPR COMPLIANT</div>
             <div className="text-[8px] font-bold border border-gray-700 px-2 py-1">LEY 81 PA</div>
             <div className="text-[8px] font-bold border border-gray-700 px-2 py-1">CCPA READY</div>
             <div className="text-[8px] font-bold border border-gray-700 px-2 py-1">ISO 27001 ALIGNED</div>
          </div>
          <p className="text-[9px] text-gray-700 uppercase tracking-widest">
            Protocolo de Privacidad Internacional v4.0. <br />
            Operado bajo la soberanía digital de la República, Panamá.
          </p>
        </footer>

      </div>
    </main>
  );
}
