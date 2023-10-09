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
const fs = require('fs');
const { resolve } = require('path');
const axios = require('axios');
const AppError = require('./utils/appError')

require('dotenv').config();


//Configuraciones
app.set('port', process.env.PORT || 3000);
app.set('json spaces', 2)
 //Routes
 //Middleware
 app.use(morgan('dev'));
 app.use(express.json());
 app.use(express.urlencoded({extended:false}));
 app.use(errorHandler);
 app.use(require('./routes/index'));
 
app.all("*", (req, res, next) => {
    next(new AppError(`The URL ${req.originalUrl} does not exists`, 404));
   });
//Nuestro primer WS Get
// app.get('/', (req, res) => {    
//     res.json(
//         {
//             "Title": "Hola mundo"
//         }
//     );
// })
 
//Iniciando el servidor
app.listen(app.get('port'),()=>{
    console.log(`Server listening on port ${app.get('port')}`);
});
// const odoo = new Odoo({
//   url: 'https://idcerp.mx/xmlrpc/2',
//   // port: 8069, 
//   db: process.env.DB_NAME,
//   username: 'hostmaster@idconline.mx',
//   password: 'D3saRro1Lo'
// })
// odoo.connect(function (err){
//   if(err) {return console.log(err)}
//   console.log('Connected to Odoo server')
//       var inParams = [];
//       inParams.push([['id', '=', [ 53192, 53229 ]
//     ]]);
//       var params = [];
//       params.push(inParams);
//       odoo.execute_kw('account.invoice', 'search_read', params, function (err2, value) {
//           if (err2) { return console.log(err2); }
//           console.log(value)
//       //     res.status(200).json({
//       //         status: "success",
//       //         length: value?.length,
//       //         data: value[0],
//       //       });
//       });

// })
async function downloadFile (url, targetFile) {  
    return await new Promise((resolve, reject) => {
      http.get(url, response => {
        const code = response.statusCode ?? 0
  
        if (code >= 400) {
          return reject(new Error(response.statusMessage))
        }
  
        // handle redirects
        if (code > 300 && code < 400 && !!response.headers.location) {
            return resolve(downloadFile(response.headers.location, targetFile))
        }
  
        // save the file to disk
        const fileWriter = fs
          .createWriteStream(targetFile)
          .on('finish', () => {
            resolve({})
          })
  
        response.pipe(fileWriter)
      }).on('error', error => {
        reject(error)
      })
    })
  }

