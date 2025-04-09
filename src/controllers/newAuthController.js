require('dotenv').config();
const Odoo = require('odoo-xmlrpc'); 
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const path = require('path');
const md5 = require('md5')
const rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));
const httpsAgent = new https.Agent({ca: rootCas});
rootCas.inject();

// Configuración Odoo
const odoo = new Odoo({
    url: process.env.ODOO_URL,
    db: process.env.DB_NAME,
    username: process.env.ODOO_USERNAME,
    password: process.env.ODOO_PASSWORD,
});

// Configuración Odoo 17
const ODOO17_URL = 'https://idc.opit.mx/jsonrpc';
const ODOO17_DB = 'idc_v17_prod';

// exports.logIn = async (req, res, next) => {
//     const { user: email, pass: password } = req.body.params;
    
//     try {
//         const odoo17User = await checkOdoo17User(email, password);
        
//         if (odoo17User.valid) {
//             return res.status(200).json({
//                 data: {
//                     odooData: {
//                         test: "es 17",
//                         id: odoo17User.partnerData.id,
//                         email: odoo17User.partnerData.email
//                     },
//                     logInData: {
//                         status: "success",
//                         dataUser: {
//                             email: odoo17User.partnerData.email,
//                             nombre: odoo17User.partnerData.name || '',
//                             apellido_paterno: odoo17User.partnerData.lname || '',
//                             telefono: odoo17User.partnerData.phone || ''
//                         }
//                     }
//                 }
//             });
//         }
        
//         const logData = new FormData();
//         logData.append('login', email);
//         logData.append('password', md5(password));
//         logData.append('private_key', '{2A629162-9A1B-11E1-A5B0-5DF26188709B}');
        
//         const response = await axios.post(process.env.URL_LOGIN, logData, { httpsAgent });
        
//         //  Odoo 11
//         odoo.connect(function (err) {
//             if (err) {
//                 console.log(err);
//                 return res.status(401).json({
//                     data: {
//                         logInData: {
//                             status: "error",
//                             message: "Error connecting to Odoo"
//                         }
//                     }
//                 });
//             }
            
//             const inParams = [
//                 [['email', '=', email]],
//                 ['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 
//                  'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']
//             ];
            
//             odoo.execute_kw('res.partner', 'search_read', [inParams], function (err2, value2) {
//                 if (err2) {
//                     console.log(err2);
//                     return res.status(401).json({
//                         data: {
//                             logInData: {
//                                 status: "error",
//                                 message: "Error fetching partner data"
//                             }
//                         }
//                     });
//                 }
                
//                 let value = value2.filter(val => val.parent_id === false);
//                 res.status(200).json({
//                     data: {
//                         test: "es 11",
//                         odooData: value[0] || {},
//                         logInData: response.data
//                     }
//                 });
//             });
//         });
        
//     } catch (error) {
//         console.log('Login error:', error);
//         res.status(401).json({
//             data: {
//                 logInData: {
//                     status: "error",
//                     message: "Authentication failed"
//                 }
//             }
//         });
//     }
// };

exports.cambioPass = async (req, res, next) => {
    try {
        if (!req.body.email || !req.body.password || !req.body.password_confirm) {
          return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
    
        const response = await axios.patch(process.env.URL_CAMBIOPASS, req.body, {
          headers: {
            'Authorization': process.env.API_KEY_OPIT,
            'Content-Type': 'application/json'
          }
        });
    
        res.json(response.data);
      } catch (error) {
        console.error('Error en el proxy:', error);
        
        if (error.response) {
          res.status(error.response.status).json({
            error: error.response.data || 'Error en el servidor remoto'
          });
        } else if (error.request) {
          res.status(503).json({ error: 'No se pudo conectar con el servidor remoto' });
        } else {
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      }
}


// Función para verificar usuario en Odoo 17 usando solo JSON-RPC
async function checkOdoo17User(email, password) {
    try {
        const authResponse = await axios.post(ODOO17_URL, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "common",
                method: "login",
                args: [ODOO17_DB, "jonatan.ramos@idconline.mx", "temporal"]
            },
            id: 1
        });

        const uid = authResponse.data.result;
        if (!uid) {
            return { valid: false };
        }

        const searchResponse = await axios.post(ODOO17_URL, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute",
                args: [
                    ODOO17_DB,
                    uid,
                    "temporal",
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
        
        if (!partnerData || (partnerData.parent_id && partnerData.parent_id[0]) || !partnerData.password_custom) {
            return { valid: false };
        }

        if (partnerData.password_custom !== password) {
            return { valid: false };
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