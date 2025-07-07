const $ = jQuery;
const AGENDA_URL = "https://ftvhd.com/diaries.json";

document.addEventListener("DOMContentLoaded", function () {
  obtenerAgenda();
  setInterval(refrescarAgenda, 60000);
});

// Delegación para mostrar servidores
document.addEventListener("click", function (e) {
  const evento = e.target.closest(".evento");
  if (!evento) return;

  const servidores = evento.querySelector(".servidores");
  if (!servidores) return;

  const estaActivo = servidores.classList.contains("activo");

  // Oculta todos
  document.querySelectorAll(".servidores").forEach(s => s.classList.remove("activo"));

  // Solo activa si estaba cerrado
  if (!estaActivo) {
    servidores.classList.add("activo");
  }
});

function convertToUserTimeZone(utcHour) {
  const DateTime = luxon.DateTime;
  const utcDateTime = DateTime.fromISO(utcHour, { zone: "America/Lima" });
  const localDateTime = utcDateTime.toLocal();
  return localDateTime.toFormat("HH:mm");
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

async function refrescarAgenda() {
  await obtenerAgenda();
  console.log("Agenda actualizada");
}

async function obtenerAgenda() {
  const menuElement = document.getElementById("eventos");
  const titleAgendaElement = document.querySelector(".agenda-titulo");

  try {
    const response = await fetch(AGENDA_URL);
    const result = await response.json();
    const data = result.data;

    menuElement.innerHTML = "";

    const dateCompleted = formatDate(new Date().toISOString());
    titleAgendaElement.textContent = "Agenda - " + dateCompleted;

    data.sort((a, b) =>
      a.attributes.diary_hour.localeCompare(b.attributes.diary_hour)
    );

    data.forEach((value) => {
      let imageUrl = "https://panel.futbollibretvs.pe/uploads/sin_imagen_d36205f0e8.png";

      if (value.attributes.country?.data) {
        imageUrl = "https://panel.futbollibretvs.pe" +
          value.attributes.country.data.attributes.image.data.attributes.url;
      }

      const hora = convertToUserTimeZone(value.attributes.diary_hour);
      const nombre = value.attributes.diary_description;

      let html = `
  <li class="evento" style="list-style: none;">
    <div class="fila">
      <span class="hora-ovalo">${hora}</span>
      <img src="${imageUrl}" alt="bandera" style="width: 18px; height: 18px; border-radius: 50%;">
      <span class="nombre-evento">${nombre}</span>
    </div>
    <div class="servidores" style="margin-top: 8px;">
`;

      value.attributes.embeds.data.forEach((embed) => {
        const urlDirecto = embed.attributes.embed_iframe;
        const nombre = embed.attributes.embed_name;
        const urlCodificada = btoa(urlDirecto);

        html += `<a href="/embed/reproductor.html?r=${urlCodificada}" class="nombre-servidor">➤ ${nombre}</a>`;
      });

      html += `</div></li>`;
      menuElement.innerHTML += html;
    });

  } catch (err) {
    console.error("Error al cargar la agenda:", err);
  }
}
