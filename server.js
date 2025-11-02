// server.js
const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = path.join(__dirname, "mafias.json");
const LOG_FILE = path.join(__dirname, "logs.txt");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // index.html en carpeta "public"

// ------------------------------
// 📦 Inicializar datos
// ------------------------------
let mafias = [];

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function crearMafiasIniciales() {
  const arr = [];
  for (let i = 1; i <= 150; i++) {
    arr.push({
      id: generarId(),
      tipo: "mafia",
      nivel: "Nivel 1",
      numero: i,
      nombre: "",
      idJefe: "",
      sede: "",
      precio: 0,
      vehiculos: "",
      agregados: "",
      diaCreacion: "",
      vencimiento: "",
      estado: "activo"
    });
  }
  return arr;
}

function leerMafiasDesdeArchivo() {
  try {
    if (!fs.existsSync(DATA_FILE)) return crearMafiasIniciales();
    const contenido = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(contenido);
    if (!Array.isArray(data) || data.length === 0) return crearMafiasIniciales();
    return data;
  } catch (e) {
    console.error("Error leyendo mafias.json, regenerando archivo:", e);
    return crearMafiasIniciales();
  }
}

mafias = leerMafiasDesdeArchivo();

// ------------------------------
// 🧠 Helpers
// ------------------------------
let saveTimeout;
function guardarMafias() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mafias, null, 2));
  }, 200); // guarda cada 200ms máximo una vez
}

function agregarLog(detalle) {
  const fecha = new Date().toLocaleString("es-AR");
  fs.appendFileSync(LOG_FILE, `[${fecha}] ${detalle}\n`);
}

// ------------------------------
// 🧩 Rutas
// ------------------------------
app.get("/download-logs", (req, res) => {
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "");
  res.download(LOG_FILE, "logs.txt");
});

app.get("/mafias", (req, res) => {
  res.json(mafias);
});

// ------------------------------
// ⚡ Socket.IO
// ------------------------------
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);
  socket.emit("mafias-actualizadas", mafias);

  // Crear / Editar
  socket.on("guardar-mafia", (mafia) => {
    const index = mafias.findIndex((m) => m.id === mafia.id);

    if (index >= 0) {
      const before = { ...mafias[index] };
      mafias[index] = mafia;

      agregarLog(`EDITAR ${mafia.tipo === "mafia" ? "Mafia #" + mafia.numero : 'Barra "' + mafia.nombre + '"'}

idJefe: ${before.idJefe} -> ${mafia.idJefe}
sede: ${before.sede} -> ${mafia.sede}
precio: ${before.precio} -> ${mafia.precio}
vehiculos: ${before.vehiculos} -> ${mafia.vehiculos}
agregados: ${before.agregados} -> ${mafia.agregados}
diaCreacion: ${before.diaCreacion} -> ${mafia.diaCreacion}
vencimiento: ${before.vencimiento} -> ${mafia.vencimiento}`);

      io.emit("mafia-editada", mafia);
    } else {
      mafia.id = generarId();
      mafias.push(mafia);
      agregarLog(`CREAR ${mafia.tipo === "mafia" ? "Mafia #" + mafia.numero : 'Barra "' + mafia.nombre + '"'}`);
      io.emit("mafia-creada", mafia);
    }

    guardarMafias();
  });

  // Eliminar
  socket.on("eliminar-mafia", (id) => {
    const index = mafias.findIndex((m) => m.id === id);
    if (index >= 0) {
      const removed = mafias.splice(index, 1)[0];
      agregarLog(`ELIMINAR ${removed.tipo === "mafia" ? "Mafia #" + removed.numero : 'Barra "' + removed.nombre + '"'}`);
      io.emit("mafia-eliminada", removed.id);
      guardarMafias();
    }
  });

  // Cambiar estado o atributo específico
  socket.on("actualizar-atributo", ({ id, campo, valor }) => {
    const mafia = mafias.find((m) => m.id === id);
    if (mafia) {
      mafia[campo] = valor;
      io.emit("mafia-editada", mafia);
      guardarMafias();
    }
  });

  socket.on("disconnect", () => console.log("🔴 Cliente desconectado:", socket.id));
});

// ------------------------------
// 🚀 Puerto
// ------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
