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



