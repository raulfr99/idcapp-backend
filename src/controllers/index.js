const Odoo = require('odoo-xmlrpc')
require('dotenv').config();

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