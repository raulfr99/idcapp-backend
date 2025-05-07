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

exports.logIn = async (req, res, next) => {
    const { user: email, pass: password } = req.body.params;
    
    try {
        const odoo17User = await checkOdoo17User(email, password);
        
        if (odoo17User.valid) {
            return res.status(200).json({
                data: {
                    odooData: {
                        test: "es 17",
                        id: odoo17User.partnerData.id,
                        email: odoo17User.partnerData.email
                    },
                    logInData: {
                        status: "success",
                        dataUser: {
                            email: odoo17User.partnerData.email,
                            nombre: odoo17User.partnerData.name || '',
                            apellido_paterno: odoo17User.partnerData.lname || '',
                            telefono: odoo17User.partnerData.phone || ''
                        }
                    }
                }
            });
        }
        
        const logData = new FormData();
        logData.append('login', email);
        logData.append('password', md5(password));
        logData.append('private_key', '{2A629162-9A1B-11E1-A5B0-5DF26188709B}');
        
        const response = await axios.post(process.env.URL_LOGIN, logData, { httpsAgent });
        
        //  Odoo 11
        odoo.connect(function (err) {
            if (err) {
                console.log(err);
                return res.status(401).json({
                    data: {
                        logInData: {
                            status: "error",
                            message: "Error connecting to Odoo"
                        }
                    }
                });
            }
            
            const inParams = [
                [['email', '=', email]],
                ['email', 'phone', 'adress3', 'date', 'contact_address', 'is_company', 
                 'name', 'lname', 'fname', 'display_name', 'city', 'parent_id']
            ];
            
            odoo.execute_kw('res.partner', 'search_read', [inParams], function (err2, value2) {
                if (err2) {
                    console.log(err2);
                    return res.status(401).json({
                        data: {
                            logInData: {
                                status: "error",
                                message: "Error fetching partner data"
                            }
                        }
                    });
                }
                
                let value = value2.filter(val => val.parent_id === false);
                res.status(200).json({
                    data: {
                        test: "es 11",
                        odooData: value[0] || {},
                        logInData: response.data
                    }
                });
            });
        });
        
    } catch (error) {
        console.log('Login error:', error);
        res.status(401).json({
            data: {
                logInData: {
                    status: "error",
                    message: "Authentication failed"
                }
            }
        });
    }
};

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


exports.createUser = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es requerido' });
  }

  try {
    // 1. Autenticación con Odoo
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
      return res.status(401).json({ error: 'Error de autenticación con Odoo QA' });
    }

    // 2. Buscar TODOS los partners con ese email (no solo el primero)
    const partnersResponse = await axios.post(process.env.ODOO17_URL, {
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
          ["id", "name", "email", "customer", "subscription_count", "type"],
          0, // offset
          100 // límite alto para asegurarnos de encontrar todos
        ]
      },
      id: 2
    });

    const partners = partnersResponse.data.result;
    if (!partners || partners.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún contacto con ese correo electrónico' });
    }

    // 3. Filtrar para encontrar el partner principal (con suscripción)
    const mainPartner = partners.find(p => p.subscription_count > 0);
    if (!mainPartner) {
      return res.status(400).json({ error: 'El contacto no tiene suscripciones activas' });
    }

    // 4. Verificar si es cliente (customer = true)
    if (!mainPartner.customer) {
      return res.status(400).json({ error: 'El contacto no está marcado como cliente' });
    }

    // 5. Verificar si ya existe un usuario para este partner
    const userResponse = await axios.post(process.env.ODOO17_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute",
        args: [
          process.env.ODOO17_DB,
          uid,
          process.env.ODOO17_PW,
          "res.users",
          "search_read",
          [["partner_id", "=", mainPartner.id]],
          ["id", "login", "partner_id"],
          0,
          1
        ]
      },
      id: 3
    });

    const existingUser = userResponse.data.result && userResponse.data.result[0];

    // 6. Si existe usuario, verificar si está vinculado al partner correcto
    if (existingUser) {
      if (existingUser.partner_id[0] === mainPartner.id) {
        return res.status(400).json({ error: 'El cliente ya cuenta con un usuario registrado' });
      } else {
        // Caso especial: existe usuario pero vinculado a otro partner
        // Actualizamos el partner_id del usuario existente
        const updateResponse = await axios.post(process.env.ODOO17_URL, {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute",
            args: [
              process.env.ODOO17_DB,
              uid,
              process.env.ODOO17_PW,
              "res.users",
              "write",
              [[existingUser.id], {
                "partner_id": mainPartner.id,
                "login": mainPartner.email, // Actualizar email por si acaso
                "name": mainPartner.name
              }]
            ]
          },
          id: 4
        });

        if (!updateResponse.data.result) {
          return res.status(500).json({ error: 'Error al actualizar el usuario existente' });
        }

        return res.json({ 
          success: true,
          message: 'Usuario existente actualizado con el partner correcto',
          userId: existingUser.id,
          partnerId: mainPartner.id
        });
      }
    }

    // 7. Crear nuevo usuario Portal (si no existe)
    const createResponse = await axios.post(process.env.ODOO17_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute",
        args: [
          process.env.ODOO17_DB,
          uid,
          process.env.ODOO17_PW,
          "res.users",
          "create",
          [{
            "name": mainPartner.name,
            "login": mainPartner.email,
            "partner_id": mainPartner.id,
            "share": true, // Usuario Portal
            "company_id": 1,
            "company_ids": [1],
            "groups_id": [24, 10, 87, 45], // Grupos específicos para Portal
          }]
        ]
      },
      id: 5
    });

    const userId = createResponse.data.result;
    if (!userId) {
      return res.status(500).json({ error: 'Error al crear el usuario en el sistema' });
    }

    res.json({ 
      success: true,
      message: 'Usuario Portal creado exitosamente',
      userId: userId,
      partnerId: mainPartner.id
    });

  } catch (error) {
    console.error('Error en createUser:', error);
    
    // Manejo detallado de errores
    if (error.response) {
      const odooError = error.response.data.error || 'Error en Odoo';
      
      if (error.response.status === 404) {
        return res.status(404).json({ error: 'Recurso no encontrado en Odoo' });
      }
      
      // Error específico de partner duplicado
      if (odooError.includes('partner_id') && odooError.includes('already exists')) {
        return res.status(400).json({ 
          error: 'Existe un conflicto con un usuario vinculado a otro partner',
          details: 'El email ya está asociado a otro contacto/usuario'
        });
      }
      
      return res.status(500).json({ 
        error: 'Error en el servidor Odoo',
        details: odooError
      });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};