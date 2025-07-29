const $ = jQuery;
const AGENDA_URLS = [
   "https://ftvhd.com/diaries.json", // fuente externa
//  "https://golazoplay.com/agenda.json"               // tu archivo local
];

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
    let data = [];

for (const url of AGENDA_URLS) {
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (Array.isArray(json.data)) {
      data = data.concat(json.data);
    }
  } catch (err) {
    console.error("Error cargando eventos desde:", url, err);
  }
}

    // ✅ GENERAR DATOS ESTRUCTURADOS JSON-LD
    const sportsEvents = data.map(ev => {
      const attr = ev.attributes;
      const dateTime = `${attr.date_diary}T${attr.diary_hour}-05:00`;
      const embedUrl = "https://futbollibretv.pages.dev" + (attr.embeds?.data[0]?.attributes?.embed_iframe || "");
      const competencia = attr.country?.data?.attributes?.name || "Fútbol Internacional";
      const description = attr.diary_description.trim().replace(/\s+/g, ' ');

      return {
        "@type": "SportsEvent",
        "name": description,
        "startDate": dateTime,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "location": {
          "@type": "Place",
          "name": competencia
        },
        "url": embedUrl,
        "organizer": {
          "@type": "Organization",
          "name": "Fútbol Libre TV",
          "url": "https://futbollibretv.pages.dev/"
        },
        "description": `Partido de ${competencia} transmitido gratis por Fútbol Libre TV`
      };
    });

    const ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": sportsEvents
    }, null, 2);

    const oldScript = document.querySelector('script[type="application/ld+json"]');
    if (oldScript) oldScript.remove();
    document.head.appendChild(ldScript);
    // 🔚 FIN JSON-LD

    menuElement.innerHTML = "";

    const dateCompleted = formatDate(new Date().toISOString());
    titleAgendaElement.textContent = "Agenda - " + dateCompleted;

    data.sort((a, b) =>
      a.attributes.diary_hour.localeCompare(b.attributes.diary_hour)
    );

    data.forEach((value) => {
  let imageUrl = "https://panel.futbollibretvs.pe/uploads/sin_imagen_d36205f0e8.png";

  const imgPath = value.attributes.country?.data?.attributes?.image?.data?.attributes?.url || null;

  if (imgPath) {
  imageUrl = "https://panel.futbollibretvs.pe" + imgPath;
}

//if (eventId.startsWith("22")) {
  // GolazoPlay
  //imageUrl = "https://img.golazoplay.com" + imgPath;
//} else if (eventId.startsWith("21")) {
  // FTVHD
 // imageUrl = "https://ftvhd.com/" + imgPath;
//}


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
