const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = path.join(__dirname, "mafias.json");
const LOG_FILE = path.join(__dirname, "logs.txt");

app.use(express.json());
app.use(express.static(__dirname));

// -------------------------
// Utilidades de datos
// -------------------------
function cargarMafias() {
  if (!fs.existsSync(DATA_FILE)) {
    // Inicializar 150 mafias vacías
    const inicial = [];
    for (let i = 1; i <= 150; i++) {
      inicial.push({
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(inicial, null, 2));
    return inicial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function guardarMafias(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function registrarLog(detalle) {
  const timestamp = new Date().toLocaleString("es-AR");
  const linea = `[${timestamp}] ${detalle}\n`;
  fs.appendFileSync(LOG_FILE, linea);
}

// -------------------------
// Endpoints
// -------------------------
app.get("/mafias", (req, res) => {
  res.json(cargarMafias());
});

app.post("/mafias", (req, res) => {
  const mafias = cargarMafias();
  const nuevo = req.body;
  mafias.push(nuevo);
  guardarMafias(mafias);
  registrarLog(`CREADO ${nuevo.tipo==="mafia"?`Mafia #${nuevo.numero}`:`Barra "${nuevo.nombre}"`}`);
  io.emit("update", mafias);
  res.json({ ok: true });
});

app.put("/mafias/:id", (req, res) => {
  const mafias = cargarMafias();
  const id = req.params.id;
  const index = mafias.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "No encontrado" });

  const before = { ...mafias[index] };
  mafias[index] = req.body;
  guardarMafias(mafias);

  // Crear log detallado
  const campos = ["tipo","nivel","numero","nombre","idJefe","sede","precio","vehiculos","agregados","diaCreacion","vencimiento"];
  let detalles = `EDITAR ${mafias[index].tipo==="mafia"?`Mafia #${mafias[index].numero}`:`Barra "${mafias[index].nombre}"`}\n`;
  campos.forEach(c => {
    const b = before[c] === undefined ? "" : before[c];
    const a = mafias[index][c] === undefined ? "" : mafias[index][c];
    if (b !== a) detalles += `${c}: ${b} -> ${a}\n`;
  });
  registrarLog(detalles.trim());
  io.emit("update", mafias);
  res.json({ ok: true });
});

app.delete("/mafias/:id", (req, res) => {
  const mafias = cargarMafias();
  const id = req.params.id;
  const index = mafias.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "No encontrado" });

  const before = mafias[index];
  mafias.splice(index, 1);
  guardarMafias(mafias);
  registrarLog(`ELIMINADO ${before.tipo==="mafia"?`Mafia #${before.numero}`:`Barra "${before.nombre}"`}`);
  io.emit("update", mafias);
  res.json({ ok: true });
});

app.post("/log", (req, res) => {
  const { detalles } = req.body;
  if (detalles) registrarLog(detalles);
  res.json({ ok: true });
});

app.get("/download-logs", (req, res) => {
  res.download(LOG_FILE, "logs.txt");
});

// -------------------------
// Socket.IO para sincronización
// -------------------------
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado");
  socket.emit("update", cargarMafias());
});

// -------------------------
// Iniciar servidor
// -------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
