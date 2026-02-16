import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vfaysxbuohhwbadyorvd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYXlzeGJ1b2hod2JhZHlvcnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDc1ODksImV4cCI6MjA4NTI4MzU4OX0.8dLJ42afWgmqsxEGufS2bkvsxcacveZ-idt-KMLN5ww"
);

// 🔐 Verificar sesión
const {
  data: { user }
} = await supabase.auth.getUser();

if (!user) {
  window.location.href = "index.html";
}

// 📌 Obtener RFC del usuario
const rfcUsuario = user.email.split("@")[0];

// 🧾 Cargar facturas (SIN filtro todavía)
async function cargarFacturas() {
  const { data, error } = await supabase
    .from("facturas")
    .select("*")
    .eq("rfc", rfcUsuario)
    .order("created_at", { ascending: false });

  if (error) {
    alert("Error al cargar facturas");
    return;
  }

  const tabla = document.getElementById("tabla-facturas");
  tabla.innerHTML = "";

  data.forEach(f => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${f.transaccion || ""}</td>
      <td>${f.numero_factura || ""}</td>
      <td>${f.fecha_factura}</td>
      <td>${f.monto}</td>
      <td>${f.estatus}</td>
    `;
    tabla.appendChild(fila);
  });
}

// ➕ Registrar factura
window.registrarFactura = async function () {
  const transaccion = document.getElementById("transaccion").value;
  const numeroFactura = document.getElementById("numero_factura").value;
  const fecha = document.getElementById("fecha").value;
  const monto = document.getElementById("monto").value;

  if (!fecha || !monto) {
    alert("Fecha y monto son obligatorios");
    return;
  }

  const { error } = await supabase.from("facturas").insert([{
    rfc: rfcUsuario,
    transaccion,
    numero_factura: numeroFactura,
    fecha_factura: fecha,
    monto,
    estatus: "pendiente"
  }]);

  if (error) {
    alert("Error al registrar factura");
  } else {
    cargarFacturas();
  }
};

// 🚀 Cargar al entrar
cargarFacturas();
