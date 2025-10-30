const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

/* ------------------------- Datos en memoria ------------------------- */
let mafias = [];
let logs = [];

// Inicializar 150 mafias si no existen
if(mafias.length === 0){
  for(let i=1;i<=150;i++){
    mafias.push({
      id: Date.now().toString(36)+Math.random().toString(36).substring(2),
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
}

/* ------------------------- Servir archivos estáticos ------------------------- */
app.use(express.static(path.join(__dirname)));

/* ------------------------- Socket.IO ------------------------- */
io.on("connection", socket=>{
  console.log("Nuevo usuario conectado:", socket.id);
  
  // Enviar datos iniciales
  socket.emit("initData", { mafias, logs });

  // Guardar mafia o barra
  socket.on("guardarMafia", data=>{
    const index = mafias.findIndex(m=>m.id===data.id);
    let before = null;
    if(index >= 0){
      before = { ...mafias[index] };
      mafias[index] = data;
      logs.push(`[${new Date().toLocaleString()}] Editado: ${data.tipo} #${data.numero || data.nombre}`);
    } else {
      mafias.push(data);
      logs.push(`[${new Date().toLocaleString()}] Creado: ${data.tipo} #${data.numero || data.nombre}`);
    }
    io.emit("updateMafias", mafias);
  });

  // Cerrar / vaciar mafia o eliminar barra
  socket.on("cerrarMafia", data=>{
    const index = mafias.findIndex(m=>m.id===data.id);
    if(index < 0) return;
    const m = mafias[index];
    if(m.tipo === "mafia"){
      // vaciar
      mafias[index] = {
        ...m,
        nivel: "Nivel 1",
        idJefe: "",
        sede: "",
        precio: 0,
        vehiculos: "",
        agregados: "",
        diaCreacion: "",
        vencimiento: ""
      };
      logs.push(`[${new Date().toLocaleString()}] Cerrado: Mafia #${m.numero}`);
    } else {
      // eliminar barra
      mafias.splice(index,1);
      logs.push(`[${new Date().toLocaleString()}] Eliminado: Barra "${m.nombre}"`);
    }
    io.emit("updateMafias", mafias);
  });

  // Descargar logs
  socket.on("descargarLogs", ()=>{
    const content = logs.join("\n") + "\n";
    const blob = Buffer.from(content, "utf-8");
    socket.emit("logsDownload", blob);
  });
});

/* ------------------------- Servidor ------------------------- */
http.listen(PORT, ()=>console.log(`Servidor corriendo en http://localhost:${PORT}`));
