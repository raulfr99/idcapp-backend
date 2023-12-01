const Odoo = require('odoo-xmlrpc')
const express = require('express');
const app = express();
const morgan=require('morgan');
const errorHandler = require("./utils/errorHandler");
const bodyParser = require('body-parser');
const path = require('path');
const https = require('https');

const multer  = require('multer')
const http = require('http'); 
const { resolve } = require('path');
const axios = require('axios');
const AppError = require('./utils/appError')
const fs = require('fs').promises;
const cors = require('cors')

require('dotenv').config();


//Configuraciones
app.set('port', process.env.PORT || 3000);
app.set('json spaces', 2)
 //Routes
 //Middleware
 app.use(morgan('dev'));
 app.use(cors())
 app.use(express.json());
 app.use(express.urlencoded({extended:false}));
 app.use(errorHandler);
 app.use(require('./routes/index'));
 
app.all("*", (req, res, next) => {
    next(new AppError(`The URL ${req.originalUrl} does not exists`, 404));
   });
app.listen(app.get('port'),()=>{
    console.log(`Server listening on port ${app.get('port')}`);
});
const odoo = new Odoo({
  url: 'https://idcerp.mx/xmlrpc/2',
  // port: 8069, 
  db: process.env.DB_NAME,
  username: 'hostmaster@idconline.mx',
  password: 'D3saRro1Lo'
})
const programmedJobsPath = 'programmedJobs.json';
// Limpiar el contenido del archivo al reiniciar el servidor
fs.writeFile(programmedJobsPath, '[]', 'utf8')
  .then(() => console.log('Archivo reiniciado al iniciar el servidor'))
  .catch(error => console.error('Error al reiniciar el archivo:', error.message));
// const schedule = require('node-schedule');
// const fecha = "2023-11-22"
// const hora = "14:58:00"
// const fechaFutura = new Date(`${fecha}T${hora}`);
// const job = schedule.scheduleJob(fechaFutura, async function () {
//   try {
//     // Realiza la llamada a la API
//     // const response = await axios.get(apiUrl);
//     console.log('Respuesta de la API');
//   } catch (error) {
//     console.error('Error al llamar a la API:', error.message);
//   }
// });

// res.json({ mensaje: 'Llamada programada con éxito' });


