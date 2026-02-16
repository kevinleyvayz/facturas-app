import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vfaysxbuohhwbadyorvd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYXlzeGJ1b2hod2JhZHlvcnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDc1ODksImV4cCI6MjA4NTI4MzU4OX0.8dLJ42afWgmqsxEGufS2bkvsxcacveZ-idt-KMLN5ww"
);

document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     MOSTRAR / OCULTAR PASSWORD
  ========================== */
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const type =
        passwordInput.type === "password"
          ? "text"
          : "password";

      passwordInput.type = type;
      togglePassword.textContent =
        type === "password" ? "👁" : "🙈";
    });
  }

});


/* =========================
   LOGIN
========================= */
window.login = async function () {

  const rfcInput = document.getElementById("rfc");
  const passwordInput = document.getElementById("password");
  const mensaje = document.getElementById("mensaje");
  const boton = document.querySelector("button");

  const rfc = rfcInput.value.trim().toUpperCase();
  const password = passwordInput.value.trim();

  mensaje.textContent = "";
  mensaje.style.opacity = "0";

  if (!rfc || !password) {
    mostrarError("Ingresa RFC y contraseña");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Validando...";

  const email = `${rfc}@sistema.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mostrarError("RFC o contraseña incorrectos");
    boton.disabled = false;
    boton.textContent = "Iniciar sesión";
    return;
  }

  localStorage.setItem("rfcActivo", rfc);

  window.location.replace("dashboard.html");
};

function mostrarError(texto) {
  const mensaje = document.getElementById("mensaje");
  mensaje.textContent = texto;
  mensaje.style.opacity = "1";
}
