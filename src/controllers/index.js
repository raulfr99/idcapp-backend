
const Odoo = require('odoo-xmlrpc')
const https = require('https');
require('dotenv').config();
const axios = require('axios');
const path = require('path');
const rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));
const httpsAgent = new https.Agent({ca: rootCas});
const FormData = require('form-data')
rootCas.inject()
const odoo = new Odoo({
    url: 'https://idcerp.mx/xmlrpc/2',
    // port: 8069, 
    db: process.env.DB_NAME,
    username: 'hostmaster@idconline.mx',
    password: 'D3saRro1Lo'
})
exports.getAllTodos = (req, res, next) => {
    // console.log('Testo: ', req.headers)
    // console.log('Testo: ', req.socket)
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
                console.log(value)
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
    console.log('Testo: ', req.body)
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
            var inParams = [];
            inParams.push([['partner_id.id', '=', req.body.params.userID]]);
            inParams.push(['name','confirmation_date','partner_id','user_id','amount_total',
            'invoice_status', 'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
            'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 'origin']);
    
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                if (err2) { return console.log(err2); }
                console.log(value)
                res.status(200).json({
                    status: "success",
                    length: value?.length,
                    data: value,
                  });
            });
    
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
                console.log(value)
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
        console.log(req.body.params)
            var inParams = [];
            inParams.push([['id', '=', req.body.params.IDS]]);
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order.line', 'search_read', params, function (err2, value) {
                if (err2) { return console.log(err2); }
                console.log(value)
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
        console.log(req.body.params)
        var finalArray = []
        var testArray = []

            var inParams = [];
            inParams.push([['partner_id.id', '=', req.body.params.userID]]);
            
            // inParams.push([['partner_id.id', '=', req.body.params.userID],['product_id.id', '=', '4']]);
            inParams.push(['name','confirmation_date','partner_id','user_id','amount_total',
            'invoice_status', 'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
            'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 'origin','product_id']);
    
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                console.log('Ventas: ',value)
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
                
                    
                    console.log('x: ',filter)
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
                    function nipCallback() {
                        console.log('test: ',testArray)
                        let subAvaible = false
                        if(testArray.subscription){
                            subAvaible = true
                        }
                        // if(result.length > 0){
                            res.status(200).json({
                                status: "success",
                                length: value?.length,
                                data: testArray,
                                subscription: subAvaible,
                            });
                            // }else{
                                // res.status(200).json({
                                //     status: "success",
                                //     length: value?.length,
                                //     data: result,
                                //     subscription: false,
                                    
                                // });
                            // }
                    }
            }
                
            });
    
    })
   };
   exports.getInvoices = (req, res, next) => {
    odoo.connect(function (err){
        if(err) {return console.log(err)}
        console.log('Connected to Odoo server')
        var inParams = [];
        inParams.push([['commercial_partner_id.id', '=', req.body.params.userID],['state','=','paid']]);
        inParams.push(['id', 'display_name','res_name','state']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('account.invoice', 'search_read', params, function (err, value) {
            console.log('test: ',value.length)
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
                console.log('ESte es el final: ',finalArray)
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
   };

   exports.logIn = (req, res, next) => {
   
    console.log(req.body.params)
    const logData = new FormData()
    logData.append('login', req.body.params.user)
    logData.append('password', req.body.params.pass)
    logData.append('private_key', '{2A629162-9A1B-11E1-A5B0-5DF26188709B}')
    axios.post('https://pagos.idconline.mx/api/ws/loginCorreo/', logData,{ httpsAgent })
    .then(function (response) {
        console.log(response.data);
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
                    console.log(value)
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