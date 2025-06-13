require('dotenv').config();
const Odoo = require('odoo-xmlrpc')

const md5 = require('md5')
const odoo = new Odoo({
    url: process.env.ODOO_URL,
    db: process.env.DB_NAME,
    username: process.env.ODOO_USERNAME,
    password: process.env.ODOO_PASSWORD,
})
//Consultas
const https = require('https');
const axios = require('axios');
const FormData = require('form-data')
//Certificado SSL para login
const path = require('path');
const rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));
const httpsAgent = new https.Agent({ ca: rootCas });
//Programar jobs para notificaciones
const schedule = require('node-schedule');
const fs = require('fs').promises
rootCas.inject()

exports.getAllTodos = (req, res, next) => {
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        var inParams = [];
        inParams.push([['email', '=', req.body.params.email]]);
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);

        var params = [];
        params.push(inParams);

        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }
            let value = value2.filter(val => val.parent_id === false);

            if (value.length === 0) {
                res.status(200).json({
                    status: "success",
                    length: value.length,
                    empty: true
                });
            } else {
                res.status(200).json({
                    status: "success",
                    length: value.length,
                    data: value[0],
                });
            }
        });
    });
};
exports.getAllSales = (req, res, next) => {
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');
        var inParams = [];
        inParams.push([['email', '=', req.body.params.userEmail]]);
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }
            value2 = value2.filter(val => val.parent_id === false);
            value2 = value2.map(obj => obj.id);
            var inParams = [];
            if (req.body.params.userID) {
                inParams.push([['partner_id.id', '=', req.body.params.userID], ['state', '=', 'done']]);
            } else {
                inParams.push([['partner_id.id', '=', value2], ['state', '=', 'done']]);
            }
            inParams.push(['name', 'confirmation_date', 'partner_id', 'user_id', 'amount_total', 'invoice_status',
                'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line',
                'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id',
                'origin', 'state', 'invoice_state', 'invoice_count', 'invoice_ids']);

            var finalArray = [];
            var params = [];
            params.push(inParams);
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
                        inParams.push([['id', '=', item.invoice_ids]]);
                        params.push(inParams);
                        odoo.execute_kw('account.invoice', 'search_read', params, function (err2, value) {
                            if (err2) {
                                console.log(err2);
                                return;
                            }
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
exports.getSub = (req, res, next) => {
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');
        var inParams = [];
        inParams.push([['name', '=', req.body.params.subName]]);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('sale.subscription', 'search_read', params, function (err2, value) {
            if (err2) {
                console.log(err2);
                return;
            }
            res.status(200).json({
                status: "success",
                length: value?.length,
                data: value[0],
            });
        });
    });
};
exports.getOrderLines = (req, res, next) => {
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');
        var inParams = [];
        inParams.push([['id', 'in', req.body.params.IDS]]);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('sale.order.line', 'search_read', params, function (err2, value) {
            if (err2) {
                console.log(err2);
                return;
            }
            res.status(200).json({
                status: "success",
                length: value?.length,
                data: value,
            });
        });
    });
};
exports.getCons = (req, res, next) => {
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');

        var finalArray = [];
        var testArray = [];
        var inParams = [];
        inParams.push([['email', '=', req.body.params.userEmail]]);
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }

            value2 = value2.filter(val => val.parent_id === false);
            value2 = value2.map(obj => obj.id);
            inParams = [];
            if (req.body.params.userID) {
                inParams.push([['partner_id.id', '=', req.body.params.userID]]);
            } else {
                inParams.push([['partner_id.id', '=', value2]]);
            }
            inParams.push(['name', 'confirmation_date', 'partner_id', 'user_id', 'amount_total', 'invoice_status',
                'subscription_management', 'partner_invoice_id', 'orderhdr_id', 'order_line',
                'x_studio_field_DGArF', 'delivery_method_id', 'partner_shipping_id', 'cfdi_usage_id',
                'origin', 'product_id', 'email']);
            params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order', 'search_read', params, function (err2, value) {
                if (err2) {
                    console.log(err2);
                    return;
                }
                if (value.length <= 0) {
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: [],
                    });
                } else {
                    let filter = value.filter((value, index, self) =>
                        index === self.findIndex((t) => (
                            t.x_studio_field_DGArF === value.x_studio_field_DGArF && t.x_studio_field_DGArF != false
                        ))
                    );
                    if (filter.length != 0) {
                        var itemsProcessed = 0;
                        filter.forEach(async (item, index) => {
                            await axios.get(process.env.URL_NIPS + item.x_studio_field_DGArF)
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
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: [],
                        });
                    }
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
exports.getInvoices = (req, res, next) => {
    // Conectar a Odoo
    odoo.connect(function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Connected to Odoo server');
        var inParams = [];
        inParams.push([['email', '=', req.body.params.userEmail]]);
        inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
            if (err2) {
                console.log(err2);
                return;
            }
            value2 = value2.filter(val => val.parent_id === false);
            value2 = value2.map(obj => obj.id);
            inParams = [];
            if (req.body.params.userID) {
                inParams.push([['commercial_partner_id.id', '=', req.body.params.userID], ['state', '=', 'paid']]);
            } else {
                inParams.push([['commercial_partner_id.id', '=', value2], ['state', '=', 'paid']]);
            }
            inParams.push(['id', 'display_name', 'res_name', 'state']);
            params = [];
            params.push(inParams);
            odoo.execute_kw('account.invoice', 'search_read', params, function (err, value) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('si: ', value)
                if (value.length == 0) {
                    res.status(200).json({
                        status: "success",
                        length: value?.length,
                        data: [],
                    });
                } else {
                    var finalArray = [];
                    var itemsProcessed = 0;
                    function callBack() {
                        console.log('todo salio bien:', finalArray)
                        res.status(200).json({
                            status: "success",
                            length: value?.length,
                            data: finalArray,
                        });
                    }
                    console.log('pre: ', value)
                    value.forEach((item, index) => {
                        inParams = [];
                        params = [];
                        inParams.push([['res_id', '=', item.id], ['mimetype', 'in', ['application/pdf', 'text/plain', 'application/xml']], ['res_model', '=', 'account.invoice']]);
                        inParams.push(['id', 'name', 'display_name', 'res_name', 'mimetype']);
                        params.push(inParams);
                        odoo.execute_kw('ir.attachment', 'search_read', params, function (err, value) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                            console.log('dentro: ', value)
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
exports.logIn = (req, res, next) => {
    const logData = new FormData();
    logData.append('login', req.body.params.user);
    logData.append('password', req.body.params.pass);
    logData.append('private_key', '{2A629162-9A1B-11E1-A5B0-5DF26188709B}');
    axios.post(process.env.URL_LOGIN, logData, { httpsAgent })
        .then(function (response) {
            odoo.connect(function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('Connected to Odoo server');
                var inParams = [];
                inParams.push([['email', '=', req.body.params.user]]);
                inParams.push(['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']);
                var params = [];
                params.push(inParams);
                odoo.execute_kw('res.partner', 'search_read', params, function (err2, value2) {
                    if (err2) {
                        console.log(err2);
                        return;
                    }
                    let value = value2.filter(val => val.parent_id === false);
                    if (value.length === 0) {
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
            console.log(error);
        });
};

exports.logInv2 = async (req, res, next) => {
  // Verificar estructura del request
  if (!req.body || !req.body.email || !req.body.password) {
    return res.status(400).json({
      status: "error",
      message: "Solicitud inválida. Se requieren email y contraseña"
    });
  }

  const { email, password } = req.body;

  try {
    // Autenticación en Odoo
    const authResponse = await axios.post(process.env.ODOO17_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "login",
        args: [process.env.ODOO17_DB, process.env.ODOO17_US, process.env.ODOO17_PW]
      },
      id: 1
    });

    const uid = authResponse.data.result;
    if (!uid) {
      return res.status(401).json({
        status: "error",
        code: "AUTH_FAILED",
        message: "Error de autenticación con Odoo"
      });
    }

    // Buscar partners
    const searchResponse = await axios.post(process.env.ODOO17_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute",
        args: [
          process.env.ODOO17_DB,
          uid,
          process.env.ODOO17_PW,
          "res.partner",
          "search_read",
          [["email", "=", email]],
          ["id", "email", "name", "lname", "phone", "parent_id", "password_custom"]
        ]
      },
      id: 2
    });

    const partners = searchResponse.data.result || [];
    const validPartners = partners.filter(p => !p.parent_id && p.password_custom);

    // Manejo de errores específicos
    if (validPartners.length === 0) {
      if (partners.length > 0) {
        return res.status(403).json({
          status: "error",
          code: "NO_PASSWORD_SET",
          message: "El usuario no tiene contraseña configurada"
        });
      }
      return res.status(404).json({
        status: "error",
        code: "USER_NOT_FOUND",
        message: "Usuario no encontrado"
      });
    }

    // Verificar contraseña
    const partner = validPartners[0];
    if (partner.password_custom !== password) {
      return res.status(401).json({
        status: "error",
        code: "INVALID_PASSWORD",
        message: "Contraseña incorrecta"
      });
    }

    // Respuesta exitosa
    return res.status(200).json({
      status: "success",
      data: {
        user: {
          id: partner.id,
          email: partner.email,
          name: partner.name || '',
          lastName: partner.lname || '',
          phone: partner.phone || ''
        },
        token: "generar-token-jwt-aqui" // Implementar JWT si es necesario
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Manejo de errores de conexión con Odoo
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        status: "error",
        code: "ODOO_UNAVAILABLE",
        message: "Servicio Odoo no disponible"
      });
    }

    return res.status(500).json({
      status: "error",
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor"
    });
  }
};
async function checkOdoo17User(email, password) {
    try {
        const authResponse = await axios.post(process.env.ODOO17_URL, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "common",
                method: "login",
                args: [process.env.ODOO17_DB, process.env.ODOO17_US, process.env.ODOO17_PW]
            },
            id: 1
        });

        const uid = authResponse.data.result;
        if (!uid) {
            return { valid: false };
        }

        const searchResponse = await axios.post(process.env.ODOO17_URL, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute",
                args: [
                    process.env.ODOO17_DB,
                    uid,
                    process.env.ODOO17_PW,
                    "res.partner",
                    "search_read",
                    [["email", "=", email]],
                    ["id", "email", "name", "lname", "phone", "parent_id", "password_custom"],
                    0,
                    1
                ]
            },
            id: 2
        });
        const partnerData = searchResponse.data.result && searchResponse.data.result[0];
        if(!partnerData.password_custom){
            return { valid: false };
        }
        
        if (!partnerData || (partnerData.parent_id && partnerData.parent_id[0])) {
            return { valid: false };
        }

        if (partnerData.password_custom && partnerData.password_custom !== password) {
            return { 
                valid: false,
                wrongPassword: true 
            };
        }

        return {
            valid: true,
            partnerData: partnerData
        };

    } catch (error) {
        console.error('Error checking Odoo 17 user:', error);
        return { valid: false };
    }
}
const trabajosProgramadosPath = 'programmedJobs.json'
exports.schedule = async (req, res) => {
    const { fecha, hora, bigUrl, title, body, dateSent } = req.body;
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
                    ...(bigUrl && { bigUrl: bigUrl })
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
            const indice = trabajosProgramados.findIndex(t => t.fecha === fechaFutura);
            if (indice !== -1) {
                trabajosProgramados.splice(indice, 1);
                await fs.writeFile(trabajosProgramadosPath, JSON.stringify(trabajosProgramados, null, 2), 'utf8');
            }
        }
    });
    res.json({ mensaje: 'Llamada programada con éxito a: ' });

}

exports.getJobs = async (req, res) => {
    let trabajosProgramados = [];
    try {
        const contenido = await fs.readFile(trabajosProgramadosPath, 'utf8');
        trabajosProgramados = JSON.parse(contenido);
    } catch (error) {
        console.error('Error al leer el archivo de trabajos programados:', error.message);
    }
    res.json(trabajosProgramados);
}