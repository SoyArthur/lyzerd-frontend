import React from 'react';

/**
 * LYZERD TERMS OF SERVICE - VERSION 4.0 (IRON CURTAIN)
 * Jurisdiction: Republic of Panama
 * Entity: Independent Technical Project (Non-Incorporated)
 * Last Update: February 7, 2026
 */

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-black text-gray-400 p-4 md:p-20 font-mono text-xs leading-relaxed selection:bg-red-900 selection:text-white">
      <div className="max-w-5xl mx-auto border border-gray-800 bg-gray-950 p-8 shadow-2xl">
        
        {/* TITULADO Y PREÁMBULO CRÍTICO */}
        <header className="border-b border-gray-700 pb-10 mb-10">
          <h1 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">
            Contrato de Licencia de Uso y Protocolo de Neutralidad <br />
            <span className="text-red-600">LYZERD v4.0</span>
          </h1>
          <div className="bg-red-950/20 border border-red-900 p-6 text-red-200">
            <p className="font-bold mb-2 uppercase">⚠️ AVISO DE RENUNCIA DE DERECHOS Y ACEPTACIÓN DE RIESGO EXTREMO</p>
            <p>
              ESTE DOCUMENTO REGULA EL USO DE UN EXPERIMENTO TECNOLÓGICO INDEPENDIENTE. AL INTERACTUAR CON LYZERD, 
              USTED ENTRA EN UN ACUERDO DE NATURALEZA "AS IS" (TAL CUAL). SI USTED NO COMPRENDE LA NATURALEZA IRREVERSIBLE 
              DE LAS TRANSACCIONES BLOCKCHAIN O EL CARÁCTER EXPERIMENTAL DE LOS MODELOS DE INTELIGENCIA ARTIFICIAL, 
              DEBE ABANDONAR ESTA PLATAFORMA DE INMEDIATO.
            </p>
          </div>
        </header>

        <nav className="mb-10 text-[10px] text-gray-500 border-b border-gray-800 pb-4">
          <p className="uppercase font-bold mb-2">Índice de Secciones:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <span>1. Definiciones</span>
            <span>2. Capacidad Legal</span>
            <span>3. No-Asesoría</span>
            <span>4. IA y Errores</span>
            <span>5. Protocolo de Pago</span>
            <span>6. Propiedad Intelectual</span>
            <span>7. Ley 81 (Privacidad)</span>
            <span>8. Jurisdicción Panamá</span>
          </div>
        </nav>

        {/* CONTENIDO DEL CONTRATO */}
        <div className="space-y-12 text-justify">
          
          {/* SECCIÓN 1: DEFINICIONES */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">1. Definiciones y Glosario Técnico</h2>
            <p className="mb-4">
              Para los efectos del presente contrato, se entenderá por:
            </p>
            <ul className="list-none space-y-4 ml-4">
              <li>
                <strong className="text-gray-200 text-sm">1.1. Lyzerd:</strong> Proyecto tecnológico independiente consistente en una interfaz de usuario que procesa datos de terceros mediante algoritmos de inteligencia artificial. No constituye una persona jurídica ni una empresa registrada.
              </li>
              <li>
                <strong className="text-gray-200 text-sm">1.2. Usuario:</strong> Cualquier persona natural o jurídica que acceda, consulte o interactúe con el código o la interfaz de Lyzerd.
              </li>
              <li>
                <strong className="text-gray-200 text-sm">1.3. Datos de Terceros:</strong> Información proveniente de oráculos y APIs externas (CoinGecko, Moralis, Groq) sobre los cuales Lyzerd no ejerce control ni auditoría.
              </li>
              <li>
                <strong className="text-gray-200 text-sm">1.4. Simulación Estocástica:</strong> Resultados generados por modelos de lenguaje (LLM) que poseen un margen de error intrínseco.
              </li>
            </ul>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 2: ESTATUS LEGAL DEL PROYECTO */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">2. Estatus de Proyecto Independiente (Hobbyist Clause)</h2>
            <p>
              Lyzerd se presenta como un <strong>ejercicio de desarrollo de software libre</strong>. A pesar de incluir 
              mecanismos de monetización para el sostenimiento de la infraestructura, Lyzerd no opera como una 
              entidad comercial bajo las leyes de comercio tradicional. 
            </p>
            <blockquote className="mt-4 border-l border-gray-600 pl-4 italic bg-gray-900/30 p-4">
              "El Usuario reconoce que está interactuando con una herramienta 'Peer-to-Peer'. Al no existir una 
              estructura corporativa, la responsabilidad del desarrollador se limita a la diligencia técnica básica 
              del mantenimiento del código, sin garantías de resultados comerciales."
            </blockquote>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 3: NO-ASESORÍA FINANCIERA (EL NÚCLEO) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">3. Exclusión de Servicios Financieros</h2>
            <p className="mb-4">
              Lyzerd <strong>NO ES</strong> un asesor de inversiones bajo los términos de la Superintendencia del Mercado de Valores de Panamá ni de ninguna otra agencia regulatoria internacional (SEC, FCA, ESMA).
            </p>
            <div className="bg-black p-6 border border-gray-800 space-y-4">
              <p>
                <strong>3.1. Neutralidad de Datos:</strong> El software simplemente "traduce" datos crudos de la blockchain a un lenguaje natural mediante IA. Esta traducción es puramente informativa.
              </p>
              <p>
                <strong>3.2. Riesgo de Capital:</strong> El trading de activos digitales es una actividad de alto riesgo. El Usuario acepta que puede perder el 100% de su capital basándose o no en la información de Lyzerd.
              </p>
              <p>
                <strong>3.3. Inexistencia de Mandato:</strong> No existe una relación de mandato o gestión de cartera. Lyzerd no recomienda la compra, venta o retención de ningún activo.
              </p>
            </div>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 4: PROTOCOLO DE PAGOS ON-CHAIN (PHANTOM/SOLANA) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">4. Protocolo de Adquisición de Licencias Técnicas</h2>
            <p>
              Aunque Lyzerd se encuentra actualmente en fase de acceso libre, cualquier implementación futura de 
              "Planes Premium" o "Suscripciones" se regirá por los siguientes principios de inmutabilidad:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="border border-gray-800 p-4">
                <h4 className="text-red-500 font-bold mb-2">4.1. Irreversibilidad Blockchain</h4>
                <p className="text-[10px]">
                  Cualquier transferencia enviada a través de la red Solana (vía Phantom Wallet) es definitiva. 
                  Debido a la naturaleza de la tecnología DLT, Lyzerd no puede ejecutar reembolsos, 
                  cancelaciones de transacciones o devoluciones por errores de envío del Usuario.
                </p>
              </div>
              <div className="border border-gray-800 p-4">
                <h4 className="text-red-500 font-bold mb-2">4.2. Carácter No-Reembolsable</h4>
                <p className="text-[10px]">
                  Las contribuciones o pagos por licencias se consideran "Servicios Digitales Consumidos de Inmediato". 
                  Al acceder a la potencia de cómputo de la IA, el Usuario renuncia a cualquier derecho de retracto.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 5: LIMITACIONES DE LA IA (HALLUCINATION DISCLAIMER) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">5. Descargo de Responsabilidad de Inteligencia Artificial</h2>
            <p className="mb-4">
              El Usuario reconoce y acepta los límites de la computación cognitiva actual:
            </p>
            <ul className="list-disc ml-6 space-y-3">
              <li><strong>Alucinaciones Técnicas:</strong> La IA puede interpretar erróneamente funciones de "Mint", "Freeze" o "Blacklist" dentro de un contrato inteligente.</li>
              <li><strong>Falsos Negativos:</strong> La ausencia de una advertencia de seguridad en Lyzerd no significa que el token sea seguro.</li>
              <li><strong>Dependencia de APIs:</strong> Si CoinGecko o Moralis entregan datos erróneos, la IA procesará datos erróneos. Lyzerd no audita las fuentes de origen.</li>
            </ul>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 6: LEY 81 DE PROTECCIÓN DE DATOS (PANAMÁ) */}
          <section className="bg-gray-900/50 p-6 rounded">
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">6. Política de Privacidad y Protección de Datos</h2>
            <p className="mb-4">
              En cumplimiento con la <strong>Ley 81 de 2019 de la República de Panamá</strong>, informamos:
            </p>
            <div className="space-y-4 text-[11px]">
              <p>
                <strong>6.1. Recolección Mínima:</strong> Solo almacenamos identificadores técnicos necesarios para la 
                operatividad del servicio (IPs, hashes de transacción, logs de error). No almacenamos datos sensibles.
              </p>
              <p>
                <strong>6.2. No-Comercialización:</strong> Lyzerd no vende, alquila ni cede bases de datos a terceros con fines publicitarios.
              </p>
              <p>
                <strong>6.3. Derechos ARCO:</strong> El Usuario puede solicitar el acceso o cancelación de sus datos técnicos 
                enviando un correo a <span className="text-blue-400 font-bold">privacy@lyzerd.io</span>.
              </p>
            </div>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 7: PROPIEDAD INTELECTUAL */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">7. Propiedad y Licencia Limitada</h2>
            <p>
              Todo el código fuente, algoritmos de procesamiento, logotipos, interfaces gráficas y estructuras de datos 
              son propiedad exclusiva del desarrollador de Lyzerd. Se otorga al usuario una licencia 
              <strong> limitada, revocable, no exclusiva y no transferible</strong> para el uso personal de la herramienta.
            </p>
            <p className="mt-4 text-red-400 font-bold">PROHIBICIONES ESTRICTAS:</p>
            <p className="text-[10px]">
              Queda prohibido el "scraping" masivo, la ingeniería inversa del motor de análisis, la redistribución comercial 
              de los reportes generados y cualquier intento de bypass de los límites de cuota establecidos.
            </p>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 8: CLÁUSULA NUCLEAR DE LIMITACIÓN DE RESPONSABILIDAD */}
          <section className="bg-red-950/10 p-8 border border-red-900">
            <h2 className="text-red-600 font-black mb-6 uppercase text-center text-xl">8. Limitación de Responsabilidad (INDEMNIDAD TOTAL)</h2>
            <div className="space-y-6 text-xs uppercase leading-relaxed font-bold">
              <p>
                EN NINGÚN CASO LYZERD, SUS DESARROLLADORES O COLABORADORES SERÁN RESPONSABLES POR:
              </p>
              <p className="pl-6 border-l border-red-900 text-gray-300">
                A) PÉRDIDAS FINANCIERAS DERIVADAS DEL TRADING DE CRIPTOMONEDAS.<br />
                B) ERRORES, INTERRUPCIONES O FALLOS TÉCNICOS EN EL SOFTWARE.<br />
                C) DECISIONES TOMADAS BASÁNDOSE EN EL ANÁLISIS GENERADO POR IA.<br />
                D) HACKEOS EXTERNOS A LA WALLET DEL USUARIO TRAS INTERACTUAR CON EL SITIO.
              </p>
              <p className="text-center text-white mt-8">
                LA RESPONSABILIDAD MÁXIMA DE LYZERD SE LIMITA A $0.00 USD EN EL PLAN GRATUITO 
                Y AL MONTO DE LA ÚLTIMA LICENCIA PAGADA EN EL CASO DE SERVICIOS PREMIUM.
              </p>
            </div>
          </section>

          <hr className="border-gray-800" />

          {/* SECCIÓN 9: JURISDICCIÓN (PANAMÁ) */}
          <section>
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">9. Legislación Aplicable y Resolución de Conflictos</h2>
            <p>
              Este contrato se rige en su totalidad por las leyes de la <strong>República de Panamá</strong>. 
              El Usuario renuncia expresamente a cualquier otro fuero que pudiera corresponderle por domicilio presente o futuro. 
            </p>
            <p className="mt-4 font-bold text-gray-200">
              Cualquier controversia será sometida a la jurisdicción exclusiva de los tribunales ordinarios de la 
              República de Panamá.
            </p>
          </section>

          {/* SECCIÓN 10: MODIFICACIONES */}
          <section className="pb-20">
            <h2 className="text-white font-bold mb-4 border-l-4 border-red-600 pl-3 uppercase">10. Modificaciones y Aceptación</h2>
            <p>
              Lyzerd se reserva el derecho de actualizar este "Telón de Acero" en cualquier momento. El uso continuado 
              de la plataforma después de cualquier cambio constituye una aceptación tácita e irrevocable de los nuevos términos.
            </p>
          </section>

        </div>

        {/* FOOTER TÉCNICO */}
        <footer className="border-t border-gray-800 pt-10 mt-10 text-center">
          <p className="text-[10px] text-gray-600 mb-4 uppercase tracking-[0.2em]">
            Digital Signature: LYZERD-SEC-2026-PAN-HASH-v4
          </p>
          <div className="flex justify-center gap-4">
            <span className="px-2 py-1 bg-gray-900 border border-gray-800 text-[9px]">ENCRYPTED PROTOCOL</span>
            <span className="px-2 py-1 bg-gray-900 border border-gray-800 text-[9px]">PANAMA LAW COMPLIANT</span>
            <span className="px-2 py-1 bg-gray-900 border border-gray-800 text-[9px]">P2P SOFTWARE LICENSE</span>
          </div>
          <p className="mt-8 text-gray-700 text-[9px]">
            © 2026 LYZERD TECHNOLOGIES (INDEPENDENT). NO RIGHTS RESERVED FOR THE USER. <br />
            DEVELOPED AND OPERATED FROM PANAMA.
          </p>
        </footer>

      </div>
    </main>
  );
}


