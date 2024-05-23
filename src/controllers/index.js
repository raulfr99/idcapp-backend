//Declaracion de variables de librerias
//Odoo
const Odoo = require('odoo-xmlrpc')
const odoo = new Odoo({
    url: 'https://idcerp.mx/xmlrpc/2',
    db: process.env.DB_NAME,
    username: 'hostmaster@idconline.mx',
    password: 'D3saRro1Lo'
})
//Consultas
const https = require('https');
const axios = require('axios');
const FormData = require('form-data')
//Certificado SSL para login
require('dotenv').config();
const path = require('path');
const rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));
const httpsAgent = new https.Agent({ca: rootCas});
//Programar jobs para notificaciones
const schedule = require('node-schedule');
const fs = require('fs').promises
rootCas.inject()

// Función para obtener todos los datos del usuario desde Odoo, utilizando el modelo res.partner
// Esta función se usa principalmente para mostrar el perfil del usuario en la aplicación
exports.getAllTodos = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');
        
        // Parametros para la búsqueda en Odoo
        var inParams = [];
        // Filtro: buscar por email igual al proporcionado en la solicitud
        inParams.push([['email', '=', req.body.params.email]]);
        // Campos a recuperar de Odoo
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        
        var params = [];
        params.push(inParams);

        // Ejecutar busqueda y lectura en Odoo
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }
            // Filtrar resultados para obtener solo el usuario principal (sin parent_id)
            let value = value2.filter(val => val.parent_id === false);
            
            if (value.length === 0) {
                // Si no hay resultados, responder con un estado de exito y señalando que esta vacío
                res.status(200).json({
                    status: "success",
                    length: value.length,
                    empty: true
                });
            } else {
                // Si hay resultados, responder con los datos del primer usuario principal encontrado
                res.status(200).json({
                    status: "success",
                    length: value.length,
                    data: value[0],
                });
            }
        });
    });
};
// Funcion para obtener todas las ventas del usuario desde Odoo, utilizando el modelo sale.order
// Primero se consulta el modelo res.partner para obtener la información del usuario del perfil
// Luego, se aplican filtros para consultar las ventas requeridas y se entregan resultados visibles al usuario en la app
// Los callBack se utilizan para realizar filtros durante el proceso asincrono de las consultas
exports.getAllSales = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        // Parametros para la busqueda en el modelo res.partner
        var inParams = [];
        // Filtro: buscar por email igual al proporcionado en la solicitud
        inParams.push([['email', '=', req.body.params.userEmail]]);
        // Campos a recuperar de res.partner
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        
        var params = [];
        params.push(inParams);

        // Ejecutar busqueda y lectura en res.partner
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }

            // Filtrar resultados para obtener solo el usuario principal (sin parent_id)
            value2 = value2.filter(val => val.parent_id === false);
            // Obtener los IDs de los usuarios principales
            value2 = value2.map(obj => obj.id);

            // Parametros para la busqueda en el modelo sale.order
            var inParams = [];
            if (req.body.params.userID) {
                // Si se proporciona userID (desde el app), filtrar por userID
                inParams.push([['partner_id.id', '=', req.body.params.userID], ['state', '=', 'done']]);
            } else {
                // Si no se proporciona userID, filtrar por los IDs obtenidos de res.partner
                inParams.push([['partner_id.id', '=', value2], ['state', '=', 'done']]);
            }
            // Campos a recuperar de sale.order
            inParams.push(['name', 'confirmation_date', 'partner_id', 'user_id', 'amount_total', 'invoice_status', 
                           'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
                           'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 
                           'origin', 'state', 'invoice_state', 'invoice_count', 'invoice_ids']);
            
            var finalArray = [];
            var params = [];
            params.push(inParams);

            // Ejecutar busqueda y lectura en sale.order
            odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                if (err2) {
                    console.log(err2);
                    return;
                }

                if (value.length == 0) {
                    callBack();
                } else {
                    finalArray = value;
                    // Filtrar resultados para incluir solo aquellos con facturas
                    finalArray = finalArray.filter(x => x.invoice_count != 0);

                    var itemsProcessed = 0;

                    for (let item of finalArray) {
                        inParams = [];
                        params = [];
                        // Filtrar facturas por sus IDs
                        inParams.push([['id', '=', item.invoice_ids]]);
                        params.push(inParams);

                        // Ejecutar busqueda y lectura en account.invoice
                        odoo.execute_kw('account.invoice', 'search_read', params, function (err2, value) {
                            if (err2) {
                                console.log(err2);
                                return;
                            }

                            // Validar estado de la factura
                            if (value[0].state !== 'paid' && value[0].state !== 'open') {
                                item.isValid = false;
                            } else {
                                item.isValid = true;
                            }
                            
                            itemsProcessed++;
                            if (itemsProcessed === finalArray.length) {
                                callBack();
                            }
                        });
                    }
                }
            });

            // Funcion callback para filtrar resultados finales y responder al cliente
            function callBack() {
                finalArray = finalArray.filter(x => x.isValid !== false);
                res.status(200).json({
                    status: "success",
                    length: finalArray?.length,
                    data: finalArray,
                });
            }
        });
    });
};

// Función para obtener suscripciones desde Odoo, utilizando el modelo sale.subscription
// Esta función consulta directamente las suscripciones por el nombre de la suscripción proporcionado en la solicitud
// No está siendo utilizado actualmente
exports.getSub = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        // Parametros para la búsqueda en el modelo sale.subscription (Cuando estan los corchetes vacios, es para consultar todos los campos de ODOO)
        var inParams = [];
        // Filtro: buscar por nombre de suscripcion igual al proporcionado en la solicitud
        inParams.push([['name', '=', req.body.params.subName]]);
        
        var params = [];
        params.push(inParams);

        // Ejecutar busqueda y lectura en sale.subscription
        odoo.execute_kw('sale.subscription', 'search_read', params, function (err2, value) {
            if (err2) {
                console.log(err2);
                return;
            }

            // Responder al cliente con el estado de exito y los datos de la suscripción
            res.status(200).json({
                status: "success",
                length: value?.length,
                data: value[0],
            });
        });
    });
};

// Función para obtener líneas de pedido desde Odoo, utilizando el modelo sale.order.line
// Esta función consulta directamente las líneas de pedido por los IDs proporcionados en la solicitud
// No está siendo utilizado actualmente
exports.getOrderLines = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        // Parametros para la busqueda en el modelo sale.order.line (Cuando estan los corchetes vacios, es para consultar todos los campos de ODOO)
        var inParams = [];
        // Filtro: buscar por IDs de linea de pedido igual a los proporcionados en la solicitud
        inParams.push([['id', 'in', req.body.params.IDS]]);
        
        var params = [];
        params.push(inParams);

        // Ejecutar busqueda y lectura en sale.order.line
        odoo.execute_kw('sale.order.line', 'search_read', params, function (err2, value) {
            if (err2) {
                console.log(err2);
                return;
            }

            // Responder al cliente con el estado de exito y los datos de las líneas de pedido
            res.status(200).json({
                status: "success",
                length: value?.length,
                data: value,
            });
        });
    });
};

// Función para obtener datos del usuario y sus compras, filtrando y verificando NIPs activos en una API externa
exports.getCons = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        var finalArray = [];
        var testArray = [];

        // Parámetros para la búsqueda en el modelo res.partner (Cuando estan los corchetes vacios, es para consultar todos los campos de ODOO)
        var inParams = [];
        // Filtro: buscar por email igual al proporcionado en la solicitud
        inParams.push([['email', '=', req.body.params.userEmail]]);
        // Campos a recuperar de res.partner
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        
        var params = [];
        params.push(inParams);

        // Ejecutar búsqueda y lectura en res.partner
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }

            // Filtrar resultados para obtener solo el usuario principal (sin parent_id)
            value2 = value2.filter(val => val.parent_id === false);
            // Obtener los IDs de los usuarios principales
            value2 = value2.map(obj => obj.id);

            // Parámetros para la búsqueda en el modelo sale.order
            inParams = [];
            if (req.body.params.userID) {
                // Si se proporciona userID, filtrar por userID
                inParams.push([['partner_id.id', '=', req.body.params.userID]]);
            } else {
                // Si no se proporciona userID, filtrar por los IDs obtenidos de res.partner
                inParams.push([['partner_id.id', '=', value2]]);
            }
            // Campos a recuperar de sale.order
            inParams.push(['name', 'confirmation_date', 'partner_id', 'user_id', 'amount_total', 'invoice_status', 
                           'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line', 
                           'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id', 
                           'origin', 'product_id', 'email']);

            params = [];
            params.push(inParams);

            // Ejecutar búsqueda y lectura en sale.order
            odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                if (err2) {
                    console.log(err2);
                    return;
                }

                if (value.length <= 0) {
                    // Si no hay resultados, responder con estado de éxito y datos vacíos
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: [],
                    });
                } else {
                    // Filtrar pedidos para obtener aquellos con NIP únicos y válidos (Para realizar la funcion de consultoria en el app)
                    let filter = value.filter((value, index, self) =>
                        index === self.findIndex((t) => (
                            t.x_studio_field_DGArF === value.x_studio_field_DGArF && t.x_studio_field_DGArF != false
                        ))
                    );

                    if (filter.length != 0) {
                        var itemsProcessed = 0;

                        // Verificar NIPs en la API externa
                        //entre cada resultado del API, si existe uan respuesta se agregan datos al objeto de respuesta
                        //como lo son nipData, avaible, NIP, esto con el fin de realizar logica en el APP
                        //(FUNCIONALIDAD DE CONSULTORIA)
                        filter.forEach(async (item, index) => {
                            await axios.get('http://serviciowebidc.idconline.mx/CONSULTORES/API/CLIENTES/' + item.x_studio_field_DGArF)
                                .then(res => {
                                    filter[index].nipData = res.data;
                                    filter[index].avaible = true;
                                    filter[index].NIP = filter[index].x_studio_field_DGArF;
                                    filter.subscription = true;
                                })
                                .catch(err => {
                                    filter[index].avaible = false;
                                    console.log('Error: ', err.message);
                                });

                            itemsProcessed++;
                            if (itemsProcessed === filter.length) {
                                testArray = filter;
                                nipCallback();
                            }
                        });
                    } else {
                        // Si no hay NIPs válidos, responder con estado de éxito y datos vacíos
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: [],
                        });
                    }

                    // Función callback para procesar resultados finales y responder al cliente
                    function nipCallback() {
                        let subAvaible = false;
                        if (testArray.subscription) {
                            subAvaible = true;
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
        });
    });
};

// Función para obtener facturas desde Odoo, filtradas por usuario y otros criterios
// Se aplican filtros para entregar los IDs de las facturas finales, las cuales serán descargadas directamente en el dispositivo desde el frontend
exports.getInvoices = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        // Parámetros para la búsqueda en el modelo res.partner (Cuando estan los corchetes vacios, es para consultar todos los campos de ODOO)
        var inParams = [];
        // Filtro: buscar por email igual al proporcionado en la solicitud
        inParams.push([['email', '=', req.body.params.userEmail]]);
        // Campos a recuperar de res.partner
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        
        var params = [];
        params.push(inParams);

        // Ejecutar búsqueda y lectura en res.partner
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }

            // Filtrar resultados para obtener solo el usuario principal (sin parent_id)
            value2 = value2.filter(val => val.parent_id === false);
            // Obtener los IDs de los usuarios principales
            value2 = value2.map(obj => obj.id);

            // Parámetros para la búsqueda en el modelo account.invoice
            inParams = [];
            if (req.body.params.userID) {
                // Si se proporciona userID, filtrar por userID y estado 'paid'
                inParams.push([['commercial_partner_id.id', '=', req.body.params.userID], ['state', '=', 'paid']]);
            } else {
                // Si no se proporciona userID, filtrar por los IDs obtenidos de res.partner y estado 'paid'
                inParams.push([['commercial_partner_id.id', '=', value2], ['state', '=', 'paid']]);
            }
            // Campos a recuperar de account.invoice
            inParams.push(['id', 'display_name', 'res_name', 'state']);
            
            params = [];
            params.push(inParams);

            // Ejecutar búsqueda y lectura en account.invoice
            odoo.execute_kw('account.invoice', 'search_read', params, function (err, value) {
                if (err) {
                    console.log(err);
                    return;
                }

                if (value.length == 0) {
                    // Si no hay resultados, responder con estado de éxito y datos vacíos
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: [],
                    });
                } else {
                    var finalArray = [];
                    var itemsProcessed = 0;

                    // Función callback para procesar resultados finales y responder al cliente
                    function callBack() {
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: finalArray,
                        });
                    }

                    // Filtrar y obtener los adjuntos de las facturas
                    value.forEach((item, index) => {
                        inParams = [];
                        params = [];
                        // Filtro: buscar adjuntos de tipo PDF, texto plano o XML, relacionados con la factura
                        inParams.push([['res_id', '=', item.id], ['mimetype', 'in', ['application/pdf', 'text/plain', 'application/xml']], ['res_model', '=', 'account.invoice']]);
                        // Campos a recuperar de ir.attachment
                        inParams.push(['id', 'name', 'display_name', 'res_name', 'mimetype']);
                        
                        params.push(inParams);

                        // Ejecutar búsqueda y lectura en ir.attachment
                        odoo.execute_kw('ir.attachment', 'search_read', params, function (err, value) {
                            if (err) {
                                console.log(err);
                                return;
                            }

                            finalArray.push(...value);
                            itemsProcessed++;
                            if (itemsProcessed === value.length) {
                                callBack();
                            }
                        });
                    });
                }
            });
        });
    });
};
// Función logIn para realizar el inicio de sesión del usuario, consultando al API de pagos y Odoo
// Al final, los datos son evaluados por la aplicación
// El certificado se envía en el data de la solicitud debido a restricciones del servicio SSL en el servidor
exports.logIn = (req, res, next) => {
    // Crear un objeto FormData para enviar los datos de inicio de sesión
    const logData = new FormData();
    logData.append('login', req.body.params.user);
    logData.append('password', req.body.params.pass);
    logData.append('private_key', '{2A629162-9A1B-11E1-A5B0-5DF26188709B}');

    // Realizar una solicitud POST al API de pagos para iniciar sesión
    axios.post('https://pagos.idconline.mx/api/ws/loginCorreo/', logData, { httpsAgent })
    .then(function (response) {
        // Si la solicitud es exitosa, conectar a Odoo, ESTO SE REALIZA CON EL FIN DE VALIDAR UN PRIMER FILTRO AL USUARIO
        odoo.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            }
            console.log('Connected to Odoo server');

            // Parámetros para la búsqueda en el modelo res.partner
            var inParams = [];
            // Filtro: buscar por email igual al proporcionado en la solicitud
            inParams.push([['email', '=', req.body.params.user]]);
            // Campos a recuperar de res.partner
            inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);

            var params = [];
            params.push(inParams);

            // Ejecutar búsqueda y lectura en res.partner
            odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
                if (err2) {
                    console.log(err2);
                    return;
                }

                // Filtrar resultados para obtener solo el usuario principal (sin parent_id)
                let value = value2.filter(val => val.parent_id === false);

                if (value.length === 0) {
                    // Si no se encuentran usuarios principales, responder con datos vacíos
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: {
                            odooData: value[0],
                            logInData: response.data
                        },
                        empty: true
                    });
                } else {
                    // Si se encuentran usuarios principales, responder con los datos del usuario y la respuesta del API de pagos
                    res.status(200).json({
                        data: {
                            odooData: value[0],
                            logInData: response.data
                        },
                    });
                }
            });
        });
    })
    .catch(function (error) {
        // Manejo de errores en la solicitud al API de pagos
        console.log(error);
    });
};

   //Utilizado para el envio de notifiaciones push, envio y programacion
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