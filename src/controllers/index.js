
const Odoo = require('odoo-xmlrpc')
const https = require('https');
require('dotenv').config();
const axios = require('axios');

const odoo = new Odoo({
    url: 'http://dev-idcerp.mx/xmlrpc/2',
    // port: 8069, 
    db: process.env.DB_NAME,
    username: 'hostmaster@idconline.mx',
    password: 'D3saRro1Lo'
})
exports.getAllTodos = (req, res, next) => {
    console.log('Testo: ', req.body)
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
                res.status(200).json({
                    status: "success",
                    length: value?.length,
                    data: value[0],
                  });
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
            inParams.push([['partner_id.id', '=', '186804'],['product_id.id', '=', '4']]);
            
            // inParams.push([['partner_id.id', '=', req.body.params.userID],['product_id.id', '=', '4']]);
            inParams.push(['name','confirmation_date','partner_id','user_id','amount_total',
            'invoice_status', 'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
            'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 'origin','product_id']);
    
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                if (err2) { return console.log(err2); }
                // console.log(value)
                let filter = value.filter(val => val.product_id[0] == 4 && val.x_studio_field_DGArF && val.origin)
                 function callBack () {
                    var itemsProcessed = 0;
                    const result = finalArray.map(data =>{
                        if(filter.some(sort => sort.origin === data.name)){
                            data.NIP = filter.find(
                                sort => sort.origin === data.name
                            ).x_studio_field_DGArF;
                           
                            return data;
                        }
                        else{
                            return data;
                        }
                    })

                    result.forEach(async (item,index) => {
                         await axios.get('http://serviciowebidc.idconline.mx/CONSULTORES/API/CLIENTES/'+item.NIP)
                        .then(res => {
                            result[index].nipData = res.data
                            result[index].avaible = true

                            
                        })
                        .catch(err => {
                            result[index].avaible = false
                            console.log('Error: ', err.message);
                        });
                        itemsProcessed++;
                        if(itemsProcessed === result.length) {
                            testArray = result
                            nipCallback();
                        }

                    })
                    
                    // console.log('Construido', testo)
                    // if(result.length > 0){
                    //     res.status(200).json({
                    //         status: "success",
                    //         length: value?.length,
                    //         data: result,
                    //         subscription: true,
                    //     });
                    // }else{
                    //     res.status(200).json({
                    //         status: "success",
                    //         length: value?.length,
                    //         data: result,
                    //         subscription: false,
                            
                    //     });
                    // }
                    // console.log('Final: ', finalArray)
                }
                 function nipCallback() {
                    console.log('test: ',testArray)
                    // if(result.length > 0){
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: testArray,
                            // subscription: true,
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

                var itemsProcessed = 0;
                filter.forEach(item => {
                inParams = []
                params = []
                inParams.push([['name', '=', item.origin]]);
                inParams.push(['date_start', 'recurring_next_date','name']);
                params.push(inParams);
                odoo.execute_kw('sale.subscription', 'search_read', params, function(err,value){
                if (err) { return console.log(err); }
                    let yourDate = new Date()
                    let formatedDate = yourDate.toISOString().split('T')[0]
                if(new Date(value[0].recurring_next_date) >= new Date(formatedDate)){
                    finalArray.push(value[0])
                }else{

                }
                itemsProcessed++;
                if(itemsProcessed === filter.length) {
                    callBack();
                }
                })
                })
                // inParams = []
                // params = []
                // inParams.push([['name', '=', filter[0].origin]]);
                // let NIP = filter[0].x_studio_field_DGArF
                // // inParams.push(['id', 'name','display_name','res_name']);
                // params.push(inParams);
                
                // odoo.execute_kw('sale.subscription', 'search_read', params, function(err,value){
                //     if (err) { return console.log(err); }
                //     let yourDate = new Date()
                //     let formatedDate = yourDate.toISOString().split('T')[0]
                //     if(new Date(value[0].recurring_next_date) >= new Date(formatedDate)){
                //         res.status(200).json({
                //             status: "success",
                //             length: value?.length,
                //             data: value,
                //             subscription: true,
                //             NIP: NIP
                //         });
                //     }else{
                //         res.status(200).json({
                //             status: "success",
                //             length: value?.length,
                //             // data: value,
                //             message: "La suscripcion ha vencido!",
                //             subscription: false
                //         });
                //     }
                    
                //     console.log(value)
                       
                // })
                
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
            let testID = value[0].id
            if (err) { return console.log(err); }
            inParams = []
            params = []
            inParams.push([['res_id', '=', testID ],['mimetype','=', ['application/pdf','text/plain','application/xml']],['res_model','=','account.invoice']]);
            inParams.push(['id', 'name','display_name','res_name']);
            params.push(inParams);

            odoo.execute_kw('ir.attachment', 'search_read', params, function(err,value){
                if (err) { return console.log(err); }
                console.log(value)
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: value,
                    });
            })
        });
    })
   };