import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

let mafias = [];
for(let i=1;i<=150;i++){
  mafias.push({ id:i.toString(), tipo:"mafia", nivel:"Nivel 1", numero:i, nombre:"", idJefe:"", sede:"", precio:0, vehiculos:"", agregados:"", diaCreacion:"", vencimiento:"" });
}

app.get("/data",(req,res)=>res.json(mafias));

io.on("connection",socket=>{
  socket.emit("actualizar",mafias);
  socket.on("update",data=>{
    mafias=data;
    io.emit("actualizar",mafias);
  });
});

app.post("/log",(req,res)=>{
  const {accion,tipo,identificador,before,after}=req.body;
  const fecha=new Date().toLocaleString("es-AR");
  let texto=`[${fecha}] ${accion.toUpperCase()} ${identificador}\n`;
  const campos=["tipo","nivel","numero","nombre","idJefe","sede","precio","vehiculos","agregados","diaCreacion","vencimiento"];
  campos.forEach(c=>{
    const b=before&&before[c]?before[c]:"";
    const a=after&&after[c]?after[c]:"";
    if(b!==a) texto+=`${c}: ${b} -> ${a}\n`;
  });
  texto+="\n";
  fs.appendFileSync("logs.txt",texto);
  res.sendStatus(200);
});

app.get("/download-logs",(req,res)=>{
  res.download("logs.txt");
});

server.listen(PORT,()=>console.log(`✅ Servidor activo en puerto ${PORT}`));
