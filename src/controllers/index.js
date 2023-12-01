
const Odoo = require('odoo-xmlrpc')
const https = require('https');
require('dotenv').config();
const axios = require('axios');
const path = require('path');
const rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));
const httpsAgent = new https.Agent({ca: rootCas});
const FormData = require('form-data')
const schedule = require('node-schedule');
const fs = require('fs').promises
rootCas.inject()
const odoo = new Odoo({
    url: 'https://idcerp.mx/xmlrpc/2',
    // port: 8069, 
    db: process.env.DB_NAME,
    username: 'hostmaster@idconline.mx',
    password: 'D3saRro1Lo'
})
exports.getAllTodos = (req, res, next) => {
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
            var inParams = [];
            inParams.push([['email', '=', req.body.params.email]]);
            inParams.push(['email','phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
                if (err2) { return console.log(err2); }
                let value = value2.filter(val => val.parent_id === false)
                if(value.length === 0){
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        // data: value[0],
                        empty : true
                        });
                }else{
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: value[0],
                      });
                }
                
            });
    
    })
   };
exports.getAllSales = (req, res, next) => {
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
        var inParams = [];
        inParams.push([['email', '=', req.body.params.userEmail]]);
            // inParams.push(['email']);
        inParams.push(['email','phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) { return console.log(err2); }
            value2 = value2.filter(val => val.parent_id === false)
            value2 =  value2.map(obj => obj.id)
            var inParams = [];
            // inParams.push([['partner_id.id', '=', req.body.params.userID], ['state','=', 'done']]);
            (req.body.params.userID ? inParams.push([['partner_id.id', '=', req.body.params.userID], ['state','=', 'done']]) : inParams.push([['partner_id.id', '=', value2], ['state','=', 'done']]))
            inParams.push(['name','confirmation_date','partner_id','user_id','amount_total',
            'invoice_status', 'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
            'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 'origin', 'state', 'invoice_state', 'invoice_count', 'invoice_ids']);
                var finalArray = []
                var list = []
                var params = [];
                params.push(inParams);
                odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                    if (err2) { return console.log(err2); }
                    if(value.length == 0){
                        callBack()
                    }else{
                        finalArray = value
                        finalArray = finalArray.filter(x => x.invoice_count != 0)
                        var itemsProcessed = 0;
                            for(let item of finalArray){
                                    inParams = [];
                                    params = []
                                    inParams.push([['id', '=', item.invoice_ids]]);
                                    params.push(inParams);
                                    odoo.execute_kw('account.invoice', 'search_read', params, function (err2, value) {
                                        if (err2) { return console.log(err2); }
                                            if(value[0].state !== 'paid' && value[0].state !== 'open' ){
                                                item.isValid = false
                                            }else{
                                                item.isValid = true
                                            }
                                            itemsProcessed++;
                                            if(itemsProcessed === finalArray.length) {
                                                callBack();
                                            }
                                    })
                            }
                    }
                });
                function callBack() {
                    finalArray = finalArray.filter(x => x.isValid !== false)
                    res.status(200).json({
                        status: "success",
                        length: finalArray?.length,
                        data: finalArray,
                    });
                }
        })
    })
   };
   exports.getSub = (req, res, next) => {
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
            var inParams = [];
            inParams.push([['name', '=', req.body.params.subName]]);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.subscription', 'search_read', params, function (err2, value) {
                if (err2) { return console.log(err2); }
                res.status(200).json({
                    status: "success",
                    length: value?.length,
                    data: value[0],
                  });
            });
    
    })
   };
   exports.getOrderLines = (req, res, next) => {
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
            var inParams = [];
            inParams.push([['id', '=', req.body.params.IDS]]);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order.line', 'search_read', params, function (err2, value) {
                if (err2) { return console.log(err2); }
                res.status(200).json({
                    status: "success",
                    length: value?.length,
                    data: value,
                  });
            });
    
    })
   };
   exports.getCons = (req, res, next) => {
       odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
        var finalArray = []
        var testArray = []
            var inParams = [];
            inParams.push([['email', '=', req.body.params.userEmail]]);
            inParams.push(['email','phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
                if (err2) { return console.log(err2); }
                value2 = value2.filter(val => val.parent_id === false)
                value2 =  value2.map(obj => obj.id)

                var inParams = [];
                (req.body.params.userID ? inParams.push([['partner_id.id', '=', req.body.params.userID]]) : inParams.push([['partner_id.id', '=', value2]]))
                
                // inParams.push([['partner_id.id', '=', req.body.params.userID],['product_id.id', '=', '4']]);
                inParams.push(['name','confirmation_date','partner_id','user_id','amount_total',
                'invoice_status', 'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
                'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 'origin','product_id', 'email']);
                var params = [];
                params.push(inParams);
                odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                    if(value.length <= 0){
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: [],
                            // subscription: true,
                        });
                    }else{
                        let filter = value.filter((value, index, self) =>
                            index === self.findIndex((t) => (
                                t.x_studio_field_DGArF === value.x_studio_field_DGArF && t.x_studio_field_DGArF != false
                            ))
                        )
                        if(filter.length != 0){
                            if (err2) { return console.log(err2); }
                            var itemsProcessed = 0;
                            filter.forEach(async (item,index) => {
                                await axios.get('http://serviciowebidc.idconline.mx/CONSULTORES/API/CLIENTES/'+item.x_studio_field_DGArF)
                                .then(res => {
                                    filter[index].nipData = res.data
                                    filter[index].avaible = true
                                    filter[index].NIP = filter[index].x_studio_field_DGArF
                                    filter.subscription = true
                                })
                                .catch(err => {
                                    filter[index].avaible = false
                                    console.log('Error: ', err.message);
                                });
                                itemsProcessed++;
                                if(itemsProcessed === filter.length) {
                                    testArray = filter
                                    nipCallback();
                                }
    
                            })
                        }else{                  
                            res.status(200).json({
                                status: "success",
                                length: value?.length,
                                data: [],
                                // subscription: true,
                            });
                        }
                        
                        function nipCallback() {
                            let subAvaible = false
                            if(testArray.subscription){
                                subAvaible = true
                            }
                                res.status(200).json({
                                    status: "success",
                                    length: testArray.length,
                                    data: testArray,
                                    subscription: subAvaible,
                                });
                        }
                }
            });
            })
    })
   };
   exports.getInvoices = (req, res, next) => {
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
        var inParams = [];
        inParams.push([['email', '=', req.body.params.userEmail]]);
        inParams.push(['email','phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) { return console.log(err2); }
            value2 = value2.filter(val => val.parent_id === false)
            value2 =  value2.map(obj => obj.id)
            var inParams = [];
            (req.body.params.userID ? inParams.push([['commercial_partner_id.id', '=', req.body.params.userID], ['state','=', 'paid']]) : inParams.push([['commercial_partner_id.id', '=', value2], ['state','=', 'paid']]))
            // inParams.push([['commercial_partner_id.id', '=', req.body.params.userID],['state','=','paid']]);
            inParams.push(['id', 'display_name','res_name','state']);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('account.invoice', 'search_read', params, function (err, value) {
                if(value.length == 0){
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: [],
                    });
                }else{
                var finalArray = []
                if (err) { return console.log(err); }
                var itemsProcessed = 0
                function callBack() {
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: finalArray,
                    });
                }
                let evaluateInv = value
                evaluateInv.forEach((item,index) =>{
                    inParams = []
                    params = []
                    inParams.push([['res_id', '=', item.id ],['mimetype','=', ['application/pdf','text/plain','application/xml']],['res_model','=','account.invoice']]);
                    inParams.push(['id', 'name','display_name','res_name', 'mimetype']);
                    params.push(inParams);
        
                    odoo.execute_kw('ir.attachment', 'search_read', params, function(err,value){
                        if (err) { return console.log(err); }
                        finalArray.push(...value)
                        itemsProcessed++;
                        if(itemsProcessed === evaluateInv.length) {
                            callBack();
                        }
                    })
                })
            }
            
            });
    })
    })
   };

   exports.logIn = (req, res, next) => {
    const logData = new FormData()
    logData.append('login', req.body.params.user)
    logData.append('password', req.body.params.pass)
    logData.append('private_key', '{2A629162-9A1B-11E1-A5B0-5DF26188709B}')
    axios.post('https://pagos.idconline.mx/api/ws/loginCorreo/', logData,{ httpsAgent })
    .then(function (response) {
        odoo.connect(function (err){
            if(err) {return console.log(err)}
            console.log('Connected to Odoo server')
                var inParams = [];
                inParams.push([['email', '=', req.body.params.user]]);
                inParams.push(['email','phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
                var params = [];
                params.push(inParams);
                odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
                    if (err2) { return console.log(err2); }
                    let value = value2.filter(val => val.parent_id === false)
                    if(value.length === 0){
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: {
                                odooData: value[0],
                                logInData: response.data
                            },
                            empty : true
                            });
                    }else{
                        res.status(200).json({
                            data: {
                                odooData: value[0],
                                logInData: response.data
                            },
                          });
                    }
                    
                });
        
        })
    })
    .catch(function (error) {
        console.log(error);
    })
   }
   const getUserIDS = (email) => {
    let test
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        // console.log('Connected to Odoo server')
            var inParams = [];
            inParams.push([['email', '=', email]]);
            inParams.push(['email','phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
                if (err2) { return console.log(err2); }
                let value = value2.filter(val => val.parent_id === false)
                test = value
            })
            })
            return test
   }
   const trabajosProgramadosPath = 'programmedJobs.json'
   exports.schedule = async (req,res) => {
    console.log(req.body)
    const { fecha, hora, bigUrl, title, body, dateSent } = req.body;
    console.log(fecha, hora, bigUrl, title, body, dateSent)
    const fechaActual = new Date();
    const fechaFutura = new Date(`${fecha}T${hora}`);
    if (fechaFutura <= fechaActual) {
        return res.status(400).json({ mensaje: 'La fecha y hora proporcionadas deben ser mayores que la fecha y hora actuales.' });
    }
    let trabajosProgramados = []
    try {
        const contenido = await fs.readFile(trabajosProgramadosPath, 'utf8');
        trabajosProgramados = JSON.parse(contenido);
    } catch (error) {
        console.error('Error al leer el archivo de trabajos programados:', error.message);
    }
    trabajosProgramados.push({ fecha: fechaFutura });
    try {
      await fs.writeFile(trabajosProgramadosPath, JSON.stringify(trabajosProgramados, null, 2), 'utf8');
    } catch (error) {
      console.error('Error al escribir en el archivo de trabajos programados:', error.message);
    }
    const job = schedule.scheduleJob(fechaFutura, async function () {
        try {
            // const response = await axios.get(apiUrl);
            axios
            .post("https://app.nativenotify.com/api/notification", {
              appId: 12290,
              appToken: 'NUU1zD6mlYTqs9y6NYrH5T',
              title: title, 
              body: body, 
              dateSent: fechaFutura, 
              // pushData: { yourProperty: 'yourPropertyValue' },
              ...(bigUrl && {bigUrl: bigUrl}) 
            })
            .then((response) => {
                console.log('Notificacion enviada correctamente!')
            })
            .catch((error) => {
              console.error('Error al enviar el formulario:', error);
            });
            console.log('Respuesta de la API:');
        } catch (error) {
        console.error('Error al llamar a la API:', error.message);
        } finally {
            // const indice = trabajosProgramados.findIndex(t => t.fecha === fechaFutura && t.apiUrl === apiUrl);
            const indice = trabajosProgramados.findIndex(t => t.fecha === fechaFutura );
            if (indice !== -1) {
                trabajosProgramados.splice(indice, 1);
                await fs.writeFile(trabajosProgramadosPath, JSON.stringify(trabajosProgramados, null, 2), 'utf8');
            }
        }
    });

    // res.json({ mensaje: 'Llamada programada con éxito a: ', fechaFutura });
    res.json({ mensaje: 'Llamada programada con éxito a: '});

   }
   
   exports.getJobs = async (req,res) => {
        let trabajosProgramados = [];
        try {
        const contenido = await fs.readFile(trabajosProgramadosPath, 'utf8');
        trabajosProgramados = JSON.parse(contenido);
        } catch (error) {
        console.error('Error al leer el archivo de trabajos programados:', error.message);
        }
        res.json(trabajosProgramados);
   }