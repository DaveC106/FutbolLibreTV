document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById('toggle-tema');
  const body = document.body;

  // Aplicar el tema guardado aunque no haya botón
  const temaGuardado = localStorage.getItem('tema');
  if (temaGuardado === 'oscuro') {
    body.classList.add('modo-oscuro');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  } else {
    if (toggleBtn) toggleBtn.textContent = '🌙';
  }

  // Si hay botón, permitir cambiar el modo
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      body.classList.toggle('modo-oscuro');
      const temaActual = body.classList.contains('modo-oscuro') ? 'oscuro' : 'claro';
      localStorage.setItem('tema', temaActual);
      toggleBtn.textContent = temaActual === 'oscuro' ? '☀️' : '🌙';
    });
  }
});
