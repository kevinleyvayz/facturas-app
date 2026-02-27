
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
/* =========================
   SUPABASE
========================= */
const supabase = createClient(
  "https://vfaysxbuohhwbadyorvd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYXlzeGJ1b2hod2JhZHlvcnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDc1ODksImV4cCI6MjA4NTI4MzU4OX0.8dLJ42afWgmqsxEGufS2bkvsxcacveZ-idt-KMLN5ww"
);
/* =========================
   VALIDAR SESIÓN (MEJORADO)
========================= */
const { data: { session }, error: sessionError } =
  await supabase.auth.getSession();
if (sessionError || !session) {
  window.location.replace("index.html");
  throw new Error("Sesión no válida");
}

const userId = session.user.id;
/* =========================
   LOGOUT SEGURO
========================= */
window.logout = async function () {
  await supabase.auth.signOut();
  // Limpia historial para que no puedan volver con botón atrás
  window.location.replace("index.html");
};
/* =========================
   OBTENER RFC
========================= */
const rfc = session.user.email
  .split("@")[0]
  .trim()
  .toUpperCase();

/* =========================
   OBTENER NOMBRE PRESTADOR
========================= */

const { data: prestadorData, error: prestadorError } = await supabase
  .from("facturas_excel")   
  .select("prestador")     
  .eq("rfc", rfc)
  .limit(1);

console.log("RFC buscado:", rfc);
console.log("Resultado prestador:", prestadorData);

if (!prestadorError && prestadorData && prestadorData.length > 0) {
  const span = document.getElementById("rfcUsuario");
  if (span) {
    span.textContent = prestadorData[0].prestador;
  }
}

/* =========================
   UTILIDADES
========================= */
function convertirFechaExcel(valor) {

  if (!valor) return null;

  // Si viene como número de Excel
  if (!isNaN(valor)) {
    const fecha = new Date((valor - 25569) * 86400 * 1000);
    return fecha.toISOString().split("T")[0];
  }

  // Si ya viene como texto fecha
  return valor;
}

/* =========================
   VARIABLES UI
========================= */
const saldoPrestadorInput = document.getElementById("saldo_prestador");
const botonGuardar = document.getElementById("btn-guardar");
const botonPDF = document.getElementById("btn-pdf");
const botonSubir = document.getElementById("btn-subir");
const mensajeEstado = document.getElementById("mensaje-estado");
const barra = document.getElementById("barra-progreso");
const diferenciaInput = document.getElementById("diferencia");
const detalle = document.getElementById("detalle-diferencia");
let diferenciaOriginal = null;
let facturasExcel = [];

/* =========================
   DESCARGAR PLANTILLA
========================= */
window.descargarPlantillaExcel = function () {

  console.log("Plantilla descargando...");

  const ws = XLSX.utils.json_to_sheet([
    {
      factura_referencia: "",
      fecha_factura: "",
      monto_factura: ""
    }
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

  XLSX.writeFile(wb, "Plantilla_Facturas.xlsx");
};

/* =========================
   CARGAR FACTURAS
========================= */
async function cargarFacturas() {
  const { data, error } = await supabase
    .from("facturas_excel")
    .select("prestador, fecha, numero_factura, monto")
    .eq("rfc", rfc)
    .order("fecha", { ascending: false });
  if (error) {
    alert("No se pudieron cargar las facturas");
    return;
  }
  const tabla = document.getElementById("tabla-facturas");
  tabla.innerHTML = "";
  let saldo = 0;
  if (!data || data.length === 0) {
    document.getElementById("saldo_ap").value = "0.00";
    return;
  }
  data.forEach(f => {
    const monto = Number(f.monto || 0);
    saldo += monto;
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${f.prestador}</td>
      <td>${f.fecha}</td>
      <td>${f.numero_factura}</td>
      <td>$${monto.toFixed(2)}</td>
    `;
    tabla.appendChild(fila);
  });
  document.getElementById("saldo_ap").value = saldo.toFixed(2);
}
await cargarFacturas();
/* =========================
   ACTUALIZAR ESTADO VISUAL
========================= */
function actualizarEstadoVisual(diferenciaActual) {
  if (diferenciaOriginal === null) return;
  const total = Math.abs(diferenciaOriginal);
  const pendiente = Math.abs(diferenciaActual);
  let progreso = 0;
  if (total > 0) {
    progreso = ((total - pendiente) / total) * 100;
  }
  barra.style.width = progreso + "%";
  if (diferenciaActual === 0) {
    mensajeEstado.innerText = "✔ Conciliado correctamente";
    mensajeEstado.style.color = "#16a34a";

    botonGuardar.style.backgroundColor = "#26be5e";
    botonGuardar.innerText = "Conciliado ✔";
    botonGuardar.disabled = true;

  if (botonSubir) {
    botonSubir.style.pointerEvents = "none";
    botonSubir.style.opacity = "0.5";
  }

    detalle.style.display = "none";
  } else {
    mensajeEstado.innerText = "Diferencia pendiente: $" + pendiente.toFixed(2);
    mensajeEstado.style.color = "#dc2626";

    botonGuardar.style.backgroundColor = "";
    botonGuardar.innerText = "Guardar conciliación";

  if (botonSubir) {
    botonSubir.style.pointerEvents = "auto";
    botonSubir.style.opacity = "1";
  }
 }
  
  if (botonPDF) botonPDF.disabled = false;
}
/* =========================
   CALCULAR DIFERENCIA
========================= */
saldoPrestadorInput.addEventListener("input", () => {
  if (saldoPrestadorInput.disabled) return;
  const saldoOxxo =
    Number(document.getElementById("saldo_ap").value) || 0;
  const saldoPrestador =
    Number(saldoPrestadorInput.value);
  if (isNaN(saldoPrestador)) {
    diferenciaInput.value = "";
    botonGuardar.disabled = true;
    detalle.style.display = "none";
    return;
  }
  const diferencia = saldoPrestador - saldoOxxo;
  if (diferenciaOriginal === null) {
    diferenciaOriginal = Math.abs(diferencia);
  }
  diferenciaInput.value = diferencia.toFixed(2);
  botonGuardar.disabled = false;
  detalle.style.display = diferencia !== 0 ? "block" : "none";
  actualizarEstadoVisual(diferencia);
});

  function mostrarModal(titulo, mensaje, tipo = "info", mostrarCancelar = false) {
  return new Promise((resolve) => {

    const modal = document.getElementById("modal-confirmacion");
    const tituloEl = document.getElementById("modal-titulo");
    const mensajeEl = document.getElementById("modal-mensaje");
    const btnConfirmar = document.getElementById("modal-confirmar");
    const btnCancelar = document.getElementById("modal-cancelar");

    tituloEl.innerText = titulo;
    mensajeEl.innerText = mensaje;

    // 🎨 Cambiar color según tipo
    const colores = {
      success: "#16a34a",
      error: "#dc2626",
      warning: "#f59e0b",
      info: "#2563eb"
    };

    tituloEl.style.color = colores[tipo] || "#1e293b";

    btnCancelar.style.display = mostrarCancelar ? "inline-block" : "none";
    btnConfirmar.innerText = mostrarCancelar ? "Confirmar" : "Aceptar";

    modal.style.display = "flex";

    const cerrar = () => {
      modal.style.display = "none";
      btnConfirmar.onclick = null;
      btnCancelar.onclick = null;
    };

    btnConfirmar.onclick = () => {
      cerrar();
      resolve(true);
    };

    btnCancelar.onclick = () => {
      cerrar();
      resolve(false);
    };

  });
}

/* =========================
   GUARDAR CONCILIACIÓN
========================= */
window.guardarConciliacion = async function () {
  const confirmar = await mostrarModal(
  "Confirmar conciliación",
  "¿Deseas registrar esta conciliación?"
);

if (!confirmar) return;

  const saldoPrestador =
    Number(saldoPrestadorInput.value) || 0;
  const factura =
    document.getElementById("factura").value.trim();
  const fechaFactura =
    document.getElementById("fecha_factura").value;
  const montoFactura =
    Number(document.getElementById("monto_factura").value) || 0;
  let diferenciaBase =
    Number(diferenciaInput.value) || 0;
  if (diferenciaBase === 0) {
    await mostrarModal("Ya está conciliado.");
    actualizarEstadoVisual(0);
    return;
  }
  if (montoFactura > diferenciaBase) {
    await mostrarModal("El importe excede la diferencia pendiente.");
    return;
  }
  if (!factura || !fechaFactura || !montoFactura) {
    await mostrarModal("Debes capturar factura, fecha e importe.");
    return;
  }
  let nuevaDiferencia = diferenciaBase - montoFactura;
  if (nuevaDiferencia < 0) nuevaDiferencia = 0;
  const { error } = await supabase
  .from("conciliacion_prestador")
  .insert([{
    user_id: userId,
    rfc,
    saldo_prestador: saldoPrestador,
    diferencia: nuevaDiferencia,
    factura_referencia: factura,
    fecha_factura: fechaFactura,
    monto_factura: montoFactura
  }]);

  if (error) {

    // Código PostgreSQL para UNIQUE violado
    if (error.code === "23505") {
      await mostrarModal(
        "Folio duplicado",
        "Esta factura ya fue registrada anteriormente para tu RFC."
      );
      return;
    }

    await mostrarModal("Error", "No se pudo guardar la conciliación.");
    return;
  }

  if (error) {
    await mostrarModal("Error al guardar");
    return;
  }
  diferenciaInput.value = nuevaDiferencia.toFixed(2);
  actualizarEstadoVisual(nuevaDiferencia);
  document.getElementById("factura").value = "";
  document.getElementById("fecha_factura").value = "";
  document.getElementById("monto_factura").value = "";
  await cargarHistorial();
};
/* =========================
   GENERAR PDF
========================= */
window.generarPDF = async function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const saldoOxxo = document.getElementById("saldo_ap").value;
  const saldoPrestador = saldoPrestadorInput.value;
  const diferencia = diferenciaInput.value;
  const folio = "CN-" + Date.now();
  const { data } = await supabase
    .from("conciliacion_prestador")
    .select("*")
    .eq("rfc", rfc)
    .order("created_at", { ascending: false });
  /* =========================
     ENCABEZADO ROJO
  ========================== */
  doc.setFillColor(180, 0, 0);
  doc.rect(0, 0, 210, 30, "F");
  const logo = new Image();
  logo.src = "img/logo.png";
  await new Promise(resolve => logo.onload = resolve);
  doc.addImage(logo, "PNG", 15, 7, 35, 15);
  doc.setTextColor(255,255,255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE CONCILIACIÓN", 105, 18, { align: "center" });
  doc.setTextColor(0,0,0);
  /* =========================
     INFO GENERAL
  ========================== */
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("RFC: " + rfc, 15, 53);
  doc.text("Fecha: " + new Date().toLocaleDateString(), 15, 61);
  /* =========================
     RESUMEN EN CAJA
  ========================== */
  doc.setDrawColor(200);
  doc.rect(15, 70, 180, 35);
  doc.text("Saldo OXXO: $" + saldoOxxo, 20, 82);
  doc.text("Saldo Prestador: $" + saldoPrestador, 20, 90);
  doc.text("Diferencia Final: $" + diferencia, 20, 98);
  /* =========================
     ESTADO GRANDE
  ========================== */
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  if (Number(diferencia) === 0) {
    doc.setTextColor(22,163,74);
    doc.text("ESTADO: CONCILIADO", 120, 90);
  } else {
    doc.setTextColor(220,38,38);
    doc.text("ESTADO: PENDIENTE", 120, 90);
  }
  doc.setTextColor(0,0,0);
  /* =========================
     TABLA DETALLE
  ========================== */
  let y = 120;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Conciliaciones", 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  // Encabezados
  doc.setFillColor(240);
  doc.rect(15, y-5, 180, 8, "F");
  doc.text("Fecha", 18, y);
  doc.text("Factura", 55, y);
  doc.text("Importe", 110, y);
  doc.text("Diferencia", 150, y);
  y += 10;
  if (data && data.length > 0) {
    data.forEach(reg => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(reg.created_at?.substring(0,10) || "", 18, y);
      doc.text(reg.factura_referencia || "-", 55, y);
      doc.text("$" + Number(reg.monto_factura || 0).toFixed(2), 110, y);
      doc.text("$" + Number(reg.diferencia).toFixed(2), 150, y);
      y += 8;
    });
  } else {
    doc.text("No hay registros.", 18, y);
  }
  /* =========================
     FOOTER
  ========================== */
  doc.setFontSize(8);
  doc.text(
    "Documento generado automáticamente por el Portal de Conciliación.",
    105,
    285,
    { align: "center" }
  );
  doc.save("Conciliacion_" + rfc + ".pdf");
};

function resetEstadoConciliacion() {

  diferenciaOriginal = null;

  saldoPrestadorInput.disabled = false;
  saldoPrestadorInput.value = "";

  diferenciaInput.value = "";

  botonGuardar.disabled = true;
  botonGuardar.innerText = "Guardar conciliación";
  botonGuardar.style.backgroundColor = "";

  detalle.style.display = "none";

  barra.style.width = "0%";

  mensajeEstado.innerText = "Pendiente de conciliación";
  mensajeEstado.style.color = "#dc2626";

  if (botonSubir) {
    botonSubir.style.pointerEvents = "auto";
    botonSubir.style.opacity = "1";
  }

}

/* =========================
   CARGAR HISTORIAL
========================= */
async function cargarHistorial() {
  const { data } = await supabase
    .from("conciliacion_prestador")
    .select("*")
    .eq("rfc", rfc)
    .order("created_at", { ascending: false });

  console.log("HISTORIAL COMPLETO:", data);
  const tablaHistorial =
    document.getElementById("tabla-historial");
  if (!tablaHistorial) return;
  tablaHistorial.innerHTML = "";

  if (!data || data.length === 0) {

  tablaHistorial.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; opacity:0.6;">
        No hay conciliaciones registradas
      </td>
    </tr>
  `;
  const btnEliminarTodas = document.getElementById("btnEliminarTodas");
  if (btnEliminarTodas) {
    btnEliminarTodas.style.display = "none";
  }

  // 🔓 RESET TOTAL
  diferenciaOriginal = null;
  saldoPrestadorInput.disabled = false;
  saldoPrestadorInput.value = "";
  diferenciaInput.value = "";
  botonGuardar.disabled = true;
  detalle.style.display = "none";
  barra.style.width = "0%";

  mensajeEstado.innerText = "Pendiente de conciliación";
  mensajeEstado.style.color = "#dc2626";

  if (botonSubir) {
    botonSubir.style.pointerEvents = "auto";
    botonSubir.style.opacity = "1";
  }

  return;
}
  
  data.forEach(reg => {
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${reg.created_at?.substring(0,10) || ""}</td>
    <td>$${Number(reg.saldo_prestador).toFixed(2)}</td>
    <td>$${Number(reg.diferencia).toFixed(2)}</td>
    <td>${reg.factura_referencia || "-"}</td>
    <td>${reg.monto_factura ? "$" + Number(reg.monto_factura).toFixed(2) : "-"}</td>
    <td>
      <button onclick="eliminarConciliacion('${reg.id}')" 
        style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">
        Eliminar
      </button>
    </td>
  `;
  tablaHistorial.appendChild(fila);
});

if (data && data.length > 0) {

  const btnEliminarTodas = document.getElementById("btnEliminarTodas");
  if (btnEliminarTodas) {
    btnEliminarTodas.style.display = "inline-block";
  }

  // 🔥 recalcular diferencia real

  const saldoOxxo =
    Number(document.getElementById("saldo_ap").value) || 0;

  const saldoPrestadorBase =
    Number(data[data.length - 1].saldo_prestador);

  const totalFacturas = data.reduce((acc, reg) => {
    return acc + Number(reg.monto_factura || 0);
  }, 0);

  let diferenciaReal =
    saldoPrestadorBase - saldoOxxo - totalFacturas;

  if (diferenciaReal < 0) diferenciaReal = 0;

  console.log("DIFERENCIA RECALCULADA:", diferenciaReal);

  diferenciaOriginal =
    Math.abs(saldoPrestadorBase - saldoOxxo);

  saldoPrestadorInput.value =
    saldoPrestadorBase.toFixed(2);

  diferenciaInput.value =
    diferenciaReal.toFixed(2);

  saldoPrestadorInput.disabled = true;

  if (diferenciaReal !== 0) {
    botonGuardar.disabled = false;
    detalle.style.display = "block";

    if (botonSubir) {
      botonSubir.style.pointerEvents = "auto";
      botonSubir.style.opacity = "1";
    }

  } else {
    botonGuardar.disabled = true;
    detalle.style.display = "none";

    if (botonSubir) {
      botonSubir.style.pointerEvents = "none";
      botonSubir.style.opacity = "0.5";
    }
  }

  actualizarEstadoVisual(diferenciaReal);
}  

else {

  // 🔓 NO HAY CONCILIACIONES → DESBLOQUEAR
  diferenciaOriginal = null;
  saldoPrestadorInput.disabled = false;
  saldoPrestadorInput.value = "";
  diferenciaInput.value = "";
  botonGuardar.disabled = true;
  detalle.style.display = "none";

  if (botonSubir) botonSubir.disabled = false;
}

}
await cargarHistorial();

window.eliminarConciliacion = async function (id) {

  const confirmar = await mostrarModal(
    "Eliminar registro",
    "¿Estás seguro de eliminar esta conciliación?",
    "warning",
    true
  );

  if (!confirmar) return;

  // 1️⃣ Eliminar registro
  const { error } = await supabase
    .from("conciliacion_prestador")
    .delete()
    .eq("id", id)
    .eq("rfc", rfc);

  if (error) {
    await mostrarModal("Error", "No se pudo eliminar.", "error");
    return;
  }

  // 2️⃣ Traer registros restantes ordenados ASC
  const { data: registros } = await supabase
    .from("conciliacion_prestador")
    .select("*")
    .eq("rfc", rfc)
    .order("created_at", { ascending: true });

  if (!registros || registros.length === 0) {
    await cargarHistorial();
    return;
  }

  // 3️⃣ Recalcular diferencia FINAL correctamente

const saldoPrestadorBase = Number(registros[0].saldo_prestador);
const saldoOxxo =
  Number(document.getElementById("saldo_ap").value) || 0;

let diferenciaActual = saldoPrestadorBase - saldoOxxo;

for (let reg of registros) {
  diferenciaActual -= Number(reg.monto_factura || 0);
}

if (diferenciaActual < 0) diferenciaActual = 0;

// 🔥 SOLO actualizamos el último registro
const ultimoId = registros[registros.length - 1].id;

  await supabase
  .from("conciliacion_prestador")
  .update({ diferencia: diferenciaActual })
  .eq("id", ultimoId);

  await mostrarModal(
    "Eliminado",
    "La conciliación fue recalculada correctamente.",
    "success"
  );

  await cargarHistorial();
};

/* =========================
   LEER ARCHIVO EXCEL
========================= */
document.getElementById("inputExcel")
  ?.addEventListener("change", procesarExcel);

async function procesarExcel(event) {

  const file = event.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  if (!jsonData || jsonData.length === 0) {
    alert("El archivo está vacío.");
    return;
  }

  // Validar columnas
  const columnasRequeridas = [
    "factura_referencia",
    "fecha_factura",
    "monto_factura"
  ];

  const columnasArchivo = Object.keys(jsonData[0]);

  for (let col of columnasRequeridas) {
    if (!columnasArchivo.includes(col)) {
      alert("Falta columna obligatoria: " + col);
      return;
    }
  }

  facturasExcel = jsonData;

  mostrarVistaPrevia(jsonData);
}

function mostrarVistaPrevia(data) {

  const preview = document.getElementById("previewExcel");

  preview.innerHTML = `
    <div style="
      background:#ffffff;
      padding:25px;
      border-radius:20px;
      box-shadow:0 20px 40px rgba(0,0,0,0.06);
      margin-top:25px;
      border:1px solid #f1f5f9;
      transition:0.3s ease;
    ">

      <div style="margin-bottom:18px;">
        <h3 style="
          font-size:20px;
          font-weight:600;
          color:#1e293b;
          margin:0;
        ">
          📊 Resumen de carga con Excel
        </h3>

        <p style="
          margin:6px 0 0 0;
          color:#64748b;
          font-size:14px;
        ">
          ${data.length} registros listos para insertarse
        </p>
      </div>

      <div style="
        max-height:260px;
        overflow:auto;
        border-radius:12px;
        border:1px solid #e2e8f0;
      ">
        <table style="
          width:100%;
          border-collapse:collapse;
          font-size:14px;
        ">
          <thead style="
            background:#f8fafc;
            position:sticky;
            top:0;
            z-index:1;
          ">
            <tr>
              <th style="padding:12px; text-align:left;">Factura</th>
              <th style="padding:12px; text-align:left;">Fecha</th>
              <th style="padding:12px; text-align:right;">Monto</th>
            </tr>
          </thead>

          <tbody>
            ${data.slice(0, 10).map((f, index) => `
              <tr style="
                border-top:1px solid #f1f5f9;
                background:${index % 2 === 0 ? '#ffffff' : '#f9fafb'};
              ">
                <td style="padding:12px;">${f.factura_referencia}</td>
                <td style="padding:12px;">
                  ${convertirFechaExcel(f.fecha_factura)}
                </td>
                <td style="
                  padding:12px;
                  text-align:right;
                  font-weight:600;
                  color:#16a34a;
                ">
                  $${parseFloat(f.monto_factura).toFixed(2)}
                </td>
              </tr>
            `).join("")}
          </tbody>

        </table>
      </div>

      <div style="
        margin-top:15px;
        font-size:13px;
        color:#94a3b8;
      ">
        Mostrando primeras 10 filas...
      </div>

    </div>
  `;

  // Mostrar botón confirmar (lo dejamos como lo tienes)
  document.getElementById("btnConfirmarCarga").style.display = "inline-block";
}

/* =========================
   CONFIRMAR CARGA MASIVA
========================= */

window.confirmarCargaExcel = async function () {

  const { data: { session: currentSession }, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !currentSession) {
    await mostrarModal(
      "Sesión expirada",
      "Tu sesión ha finalizado. Vuelve a iniciar sesión.",
      "error"
    );
    return;
  }

  if (!facturasExcel || facturasExcel.length === 0) {
    await mostrarModal(
      "Sin datos",
      "No hay facturas cargadas para procesar.",
      "warning"
    );
    return;
  }

  const saldoOxxo =
    Number(document.getElementById("saldo_ap").value) || 0;

  const saldoPrestador =
    Number(saldoPrestadorInput.value) || 0;

  let diferenciaActual = saldoPrestador - saldoOxxo;

  const totalExcel = facturasExcel.reduce((acc, row) => {
    const monto = parseFloat(
      String(row.monto_factura).replace(/[^0-9.-]+/g, "")
    ) || 0;
    return acc + monto;
  }, 0);

  if (Math.abs(totalExcel) !== Math.abs(diferenciaActual)) {
    await mostrarModal(
      "Diferencia incorrecta",
      `El total del Excel ($${totalExcel.toFixed(2)}) no coincide con la diferencia actual ($${diferenciaActual.toFixed(2)}).`,
      "error"
    );
    return;
  }

  for (let row of facturasExcel) {

    const monto = parseFloat(
      String(row.monto_factura).replace(/[^0-9.-]+/g, "")
    ) || 0;

    diferenciaActual -= monto;
    if (diferenciaActual < 0) diferenciaActual = 0;

    const { error } = await supabase
      .from("conciliacion_prestador")
      .insert([{
        user_id: currentSession.user.id,
        rfc: rfc,
        saldo_prestador: saldoPrestador,
        diferencia: diferenciaActual,
        factura_referencia: row.factura_referencia,
        fecha_factura: convertirFechaExcel(row.fecha_factura),
        monto_factura: monto
      }]);

    if (error) {
      await mostrarModal(
        "Error al guardar",
        `La factura ${row.factura_referencia} no pudo guardarse. Verifica duplicados.`,
        "error"
      );
      return;
    }
  }

  await mostrarModal(
    "Carga completada",
    "Todas las facturas fueron registradas correctamente.",
    "success"
  );

  diferenciaInput.value = "0.00";
  actualizarEstadoVisual(0);

  document.getElementById("previewExcel").innerHTML = "";
  document.getElementById("btnConfirmarCarga").style.display = "none";

  await cargarHistorial();
};

/* =========================
   ELIMINAR TODAS LAS FACTURAS
========================= */

window.eliminarTodasFacturas = async function () {

  const confirmar = await mostrarModal(
    "Eliminar todas las conciliaciones",
    "⚠ Esta acción eliminará TODAS tus facturas registradas.\n\n¿Deseas continuar?",
    "warning",
    true
  );

  if (!confirmar) return;

  const { error } = await supabase
    .from("conciliacion_prestador")
    .delete()
    .eq("rfc", rfc);

  if (error) {
    await mostrarModal(
      "Error",
      "No se pudieron eliminar las conciliaciones.",
      "error"
    );
    return;
  }

 await mostrarModal(
  "Eliminadas",
  "Todas las conciliaciones fueron eliminadas correctamente.",
  "success"
);

// 🔥 RESET VISUAL COMPLETO
resetEstadoConciliacion();

await cargarHistorial();
};
