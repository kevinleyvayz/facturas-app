import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

document.addEventListener("DOMContentLoaded", () => {

  const rfc = localStorage.getItem("rfcActivo");

  if (!rfc) {
    window.location.replace("index.html");
    return;
  }

  const span = document.getElementById("rfcUsuario");
  if (span) {
    span.textContent = rfc;
  }

});

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
   VARIABLES UI
========================= */
const saldoPrestadorInput = document.getElementById("saldo_prestador");
const botonGuardar = document.getElementById("btn-guardar");
const botonPDF = document.getElementById("btn-pdf");
const mensajeEstado = document.getElementById("mensaje-estado");
const barra = document.getElementById("barra-progreso");
const diferenciaInput = document.getElementById("diferencia");
const detalle = document.getElementById("detalle-diferencia");

let diferenciaOriginal = null;

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
    botonGuardar.style.backgroundColor = "#22c55e";
    botonGuardar.innerText = "Conciliado ✔";
    botonGuardar.disabled = true;
    detalle.style.display = "none";
  } else {
    mensajeEstado.innerText = "Diferencia pendiente: $" + pendiente.toFixed(2);
    mensajeEstado.style.color = "#dc2626";
    botonGuardar.style.backgroundColor = "";
    botonGuardar.innerText = "Guardar conciliación";
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

/* =========================
   GUARDAR CONCILIACIÓN
========================= */
window.guardarConciliacion = async function () {

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
    alert("Ya está conciliado.");
    actualizarEstadoVisual(0);
    return;
  }

  if (montoFactura > diferenciaBase) {
    alert("El importe excede la diferencia pendiente.");
    return;
  }

  if (!factura || !fechaFactura || !montoFactura) {
    alert("Debes capturar factura, fecha e importe.");
    return;
  }

  let nuevaDiferencia = diferenciaBase - montoFactura;
  if (nuevaDiferencia < 0) nuevaDiferencia = 0;

  const { error } = await supabase
    .from("conciliacion_prestador")
    .insert([{
      rfc,
      saldo_prestador: saldoPrestador,
      diferencia: nuevaDiferencia,
      factura_referencia: factura,
      fecha_factura: fechaFactura,
      monto_factura: montoFactura
    }]);

  if (error) {
    alert("Error al guardar");
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

/* =========================
   CARGAR HISTORIAL
========================= */
async function cargarHistorial() {

  const { data } = await supabase
    .from("conciliacion_prestador")
    .select("*")
    .eq("rfc", rfc)
    .order("created_at", { ascending: false });

  const tablaHistorial =
    document.getElementById("tabla-historial");

  if (!tablaHistorial) return;

  tablaHistorial.innerHTML = "";

  if (!data || data.length === 0) {
    tablaHistorial.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; opacity:0.6;">
          No hay conciliaciones registradas
        </td>
      </tr>
    `;
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
    `;

    tablaHistorial.appendChild(fila);
  });

  const ultima = data[0];

  if (ultima) {

  const diferenciaUltima = Number(ultima.diferencia);

  diferenciaOriginal = Math.abs(diferenciaUltima);

  saldoPrestadorInput.value =
    Number(ultima.saldo_prestador).toFixed(2);

  diferenciaInput.value =
    diferenciaUltima.toFixed(2);

  // 🔒 SOLO bloquear si ya está conciliado
  if (diferenciaUltima === 0) {
    saldoPrestadorInput.disabled = true;
    botonGuardar.disabled = true;
    detalle.style.display = "none";
  } else {
    saldoPrestadorInput.disabled = false;
    botonGuardar.disabled = false;
    detalle.style.display = "block";
  }

  actualizarEstadoVisual(diferenciaUltima);
}
}

await cargarHistorial();
