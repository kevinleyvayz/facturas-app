import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vfaysxbuohhwbadyorvd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYXlzeGJ1b2hod2JhZHlvcnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDc1ODksImV4cCI6MjA4NTI4MzU4OX0.8dLJ42afWgmqsxEGufS2bkvsxcacveZ-idt-KMLN5ww"
);

// 🔐 LOGIN CON RFC
window.login = async function () {
  const rfc = document.getElementById("rfc").value.trim().toUpperCase();
  const password = document.getElementById("password").value.trim();
  const mensaje = document.getElementById("mensaje");

  if (!rfc || !password) {
    mensaje.textContent = "Ingresa RFC y contraseña";
    return;
  }

  // Email ficticio basado en RFC
  const email = `${rfc}@sistema.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mensaje.textContent = "RFC o contraseña incorrectos";
    return;
  }

  // Login correcto
  window.location.href = "dashboard.html";
};
