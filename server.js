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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Inicializar archivo mafias.json si no existe
if (!fs.existsSync(DATA_FILE)) {
  const initialMafias = [];
  for (let i = 1; i <= 150; i++) {
    initialMafias.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
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
      vencimiento: ""
    });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialMafias, null, 2));
}

// Leer mafias
function leerMafias() {
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

// Guardar mafias
function guardarMafias(mafias) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(mafias, null, 2));
}

// Guardar log
function agregarLog(detalle) {
  const fecha = new Date().toLocaleString("es-AR");
  fs.appendFileSync(LOG_FILE, `[${fecha}] ${detalle}\n`);
}

// Rutas HTTP
app.get("/mafias", (req, res) => {
  const mafias = leerMafias();
  res.json(mafias);
});

app.post("/log", (req, res) => {
  const { detalles } = req.body;
  if (detalles) agregarLog(detalles);
  res.sendStatus(200);
});

app.get("/download-logs", (req, res) => {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "");
  }
  res.download(LOG_FILE, "logs.txt");
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Enviar mafias actuales al cliente nuevo
  socket.emit("mafias-actualizadas", leerMafias());

  // Crear o actualizar mafia
  socket.on("guardar-mafia", (mafia) => {
    let mafias = leerMafias();
    const index = mafias.findIndex((m) => m.id === mafia.id);
    if (index >= 0) {
      // Editar existente
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
    } else {
      // Crear nueva
      mafias.push(mafia);
      agregarLog(`CREAR ${mafia.tipo === "mafia" ? "Mafia #" + mafia.numero : 'Barra "' + mafia.nombre + '"'}
idJefe: -> ${mafia.idJefe}
sede: -> ${mafia.sede}
precio: 0 -> ${mafia.precio}
vehiculos: -> ${mafia.vehiculos}
agregados: -> ${mafia.agregados}
diaCreacion: -> ${mafia.diaCreacion}
vencimiento: -> ${mafia.vencimiento}`);
    }
    guardarMafias(mafias);
    io.emit("mafias-actualizadas", mafias);
  });

  // Eliminar mafia
  socket.on("eliminar-mafia", (id) => {
    let mafias = leerMafias();
    const index = mafias.findIndex((m) => m.id === id);
    if (index >= 0) {
      const removed = mafias.splice(index, 1)[0];
      agregarLog(`ELIMINAR ${removed.tipo === "mafia" ? "Mafia #" + removed.numero : 'Barra "' + removed.nombre + '"'}
idJefe: ${removed.idJefe}
sede: ${removed.sede}
precio: ${removed.precio}
vehiculos: ${removed.vehiculos}
agregados: ${removed.agregados}
diaCreacion: ${removed.diaCreacion}
vencimiento: ${removed.vencimiento}`);
      guardarMafias(mafias);
      io.emit("mafias-actualizadas", mafias);
    }
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Puerto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
