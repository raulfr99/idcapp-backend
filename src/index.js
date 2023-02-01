const Odoo = require('odoo-xmlrpc')
const express = require('express');
const app = express();
const morgan=require('morgan');
const errorHandler = require("./utils/errorHandler");
const bodyParser = require('body-parser');
const multer  = require('multer')
require('dotenv').config();

//test
const http = require('http'); // or 'https' for https:// URLs
const fs = require('fs');
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
app.get('/', (req, res) => {    
    res.json(
        {
            "Title": "Hola mundo"
        }
    );
})
 
//Iniciando el servidor
app.listen(app.get('port'),()=>{
    console.log(`Server listening on port ${app.get('port')}`);
});

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
//ODOO

const odoo = new Odoo({
    url: 'http://dev-idcerp.mx/xmlrpc/2',
    // port: 8069, 
    db: process.env.DB_NAME,
    username: 'hostmaster@idconline.mx',
    password: 'D3saRro1Lo'
})
odoo.connect(function (err,value){
    if(err) {return console.log(err)}
    console.log('Connected to Odoo server')
        var inParams = [];
        inParams.push([['commercial_partner_id.id', '=', '299614'],['state','=','paid']]);
        inParams.push(['id', 'display_name','res_name','state']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('account.invoice', 'search_read', params, function (err, value) {
            let testID = value[0].id
              if (err) { return console.log(err); }
              inParams = []
              params = []
              inParams.push([['res_id', '=', testID ],['mimetype','=', ['application/pdf','text/plain','application/xml']],['res_model','=','account.invoice']]);
              inParams.push(['id', 'name','display_name','res_name']);
              
              params.push(inParams);

            odoo.execute_kw('ir.attachment', 'search_read', params, function(err,value){
              if (err) { return console.log(err); }
              console.log('Resultado prueba: ', value);
            })

          });
    });