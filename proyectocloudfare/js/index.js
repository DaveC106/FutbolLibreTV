const $ = jQuery;
const AGENDA_URLS = [
   "https://ftvhd.com/diaries.json", // fuente externa
//  "https://golazoplay.com/agenda.json" // tu archivo local
];

document.addEventListener("DOMContentLoaded", function () {
  obtenerAgenda().then(() => {
    abrirPartidoDesdeHash();
  });

  // ⏱️ cada 3 minutos
  setInterval(refrescarAgenda, 180000);
});

// Delegación para mostrar servidores
document.addEventListener("click", function (e) {
  if (e.target.closest(".servidores")) {
    return;
  }

  const evento = e.target.closest(".evento");
  if (!evento) return;

  const servidores = evento.querySelector(".servidores");
  if (!servidores) return;

  const estaActivo = servidores.classList.contains("activo");

  document.querySelectorAll(".servidores").forEach(s => s.classList.remove("activo"));
  document.querySelectorAll(".nombre-evento").forEach(n => n.classList.remove("resaltado"));
  document.querySelectorAll(".evento").forEach(ev => ev.classList.remove("activo"));

  if (!estaActivo) {
    servidores.classList.add("activo");
    evento.classList.add("activo");

    const nombreEvento = evento.querySelector(".nombre-evento");
    if (nombreEvento) nombreEvento.classList.add("resaltado");

    const id = evento.getAttribute("data-id");
    if (id) {
      window.location.hash = "partido-" + id;
    }
  } else {
    history.replaceState(null, null, " ");
  }
});

function abrirPartidoDesdeHash() {
  const hash = window.location.hash;
  if (hash.startsWith("#partido-")) {
    const partidoId = hash.replace("#partido-", "");
    const evento = document.querySelector(`.evento[data-id="${partidoId}"]`);
    if (evento) {
      const servidores = evento.querySelector(".servidores");
      if (servidores) {
        servidores.classList.add("activo");
        evento.classList.add("activo");
      }
      const nombreEvento = evento.querySelector(".nombre-evento");
      if (nombreEvento) nombreEvento.classList.add("resaltado");

      setTimeout(() => {
        evento.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }
}

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
  abrirPartidoDesdeHash();
}

// 🔹 Función para quitar tildes
function quitarTildes(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

    // 🔍 AGREGAMOS EL BUSCADOR Y MENSAJE AQUÍ
    let buscador = document.getElementById("buscador-partidos");
    let mensajeNoResultados = document.getElementById("mensaje-no-resultados");

    if (!buscador) {
      buscador = document.createElement("input");
      buscador.type = "text";
      buscador.id = "buscador-partidos";
      buscador.placeholder = "Buscar partido por nombre o torneo...";
      buscador.style.width = "97%";
      buscador.style.margin = "10px 0";
      buscador.style.padding = "8px";
      buscador.style.borderRadius = "5px";
      buscador.style.border = "1px solid #ccc";
      buscador.style.backgroundColor = "#f1f3f4";
      buscador.style.color = "#000";

      titleAgendaElement.insertAdjacentElement("afterend", buscador);

      // Mensaje dinámico con botón
      mensajeNoResultados = document.createElement("div");
      mensajeNoResultados.id = "mensaje-no-resultados";
      mensajeNoResultados.style.display = "none";
      mensajeNoResultados.style.margin = "10px 0";
      mensajeNoResultados.style.padding = "10px";
      mensajeNoResultados.style.background = "#f1f3f4";
      mensajeNoResultados.style.color = "#000000ff";
      mensajeNoResultados.style.border = "1px solid #f5c6cb";
      mensajeNoResultados.style.borderRadius = "5px";
      mensajeNoResultados.style.textAlign = "center";
      mensajeNoResultados.innerHTML = `
        <p>¿No encuentras el partido que quieres ver?</p>
        <a href="https://futbolibretv.pages.dev/#sugerencias-form" 
           style="display:inline-block; margin-top:5px; padding:8px 12px; background:#15803d; color:white; text-decoration:none; border-radius:5px;">
           Pedir partido
        </a>
      `;
      buscador.insertAdjacentElement("afterend", mensajeNoResultados);

      // Evento para filtrar en tiempo real con tildes ignoradas
      buscador.addEventListener("input", function () {
        const texto = quitarTildes(this.value.toLowerCase());
        let hayResultados = false;

        document.querySelectorAll(".evento").forEach(evento => {
          const nombre = quitarTildes(evento.querySelector(".nombre-evento").textContent.toLowerCase());
          if (nombre.includes(texto)) {
            evento.style.display = "";
            hayResultados = true;
          } else {
            evento.style.display = "none";
          }
        });

        // Mostrar u ocultar mensaje si no hay resultados
        if (!hayResultados && texto.trim() !== "") {
          mensajeNoResultados.style.display = "block";
        } else {
          mensajeNoResultados.style.display = "none";
        }
      });
    }

    data.sort((a, b) =>
      a.attributes.diary_hour.localeCompare(b.attributes.diary_hour)
    );

    data.forEach((value) => {
      let imageUrl = "https://panel.futbollibretvs.pe/uploads/sin_imagen_d36205f0e8.png";
      const imgPath = value.attributes.country?.data?.attributes?.image?.data?.attributes?.url || null;
      if (imgPath) {
        imageUrl = "https://panel.futbollibretvs.pe" + imgPath;
      }

      const hora = convertToUserTimeZone(value.attributes.diary_hour);
      const nombre = value.attributes.diary_description;

      let html = `
<li class="evento" data-id="${value.id}" style="list-style: none;">
  <div class="fila">
    <span class="hora-ovalo">${hora}</span>
    <img src="${imageUrl}" alt="bandera" style="width: 18px; height: 18px; border-radius: 50%;">
    <span class="nombre-evento">${nombre}</span>
  </div>
  <div class="servidores" style="margin-top: 8px;">
    <div class="instruccion" style="font-weight:900; font-size:16px; color:#e53935; margin-bottom:6px;">
      Selecciona tu servidor preferido:
    </div>
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
