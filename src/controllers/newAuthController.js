require('dotenv').config();
const Odoo = require('odoo-xmlrpc');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const path = require('path');
const md5 = require('md5')
const rootCas = require('ssl-root-cas').create();
rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));
const httpsAgent = new https.Agent({ ca: rootCas });
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
    // Solo verificamos con Odoo 17
    const odoo17User = await checkOdoo17User(email, password);

    if (!odoo17User.valid) {
      return res.status(401).json({
        data: {
          logInData: {
            status: "error",
            message: "Credenciales inválidas o usuario no encontrado en Odoo 17"
          }
        }
      });
    }

    // Respuesta exitosa solo para Odoo 17
    return res.status(200).json({
      data: {
        odooData: {
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

  } catch (error) {
    console.log('Login error:', error);
    res.status(500).json({
      data: {
        logInData: {
          status: "error",
          message: "Error en el servidor al autenticar"
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
                // "name": mainPartner.name
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

exports.getProblematicPartners = async (req, res) => {
  console.log('[🔵] Endpoint /badUsers iniciado');
  let requestId = 1; // Contador para IDs secuenciales

  try {
    // Configuración para pruebas
    const TEST_MODE = false;
    const TEST_LIMIT = 2;
    const DRY_RUN = false; // false = aplicar correcciones realmente

    console.log('[🟡] Autenticando con Odoo...');
    const authResponse = await axios.post(process.env.ODOO17_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "login",
        args: [process.env.ODOO17_DB, process.env.ODOO17_US, process.env.ODOO17_PW]
      },
      id: requestId++
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!authResponse.data || !authResponse.data.result) {
      console.error('[🔴] Error de autenticación');
      return res.status(502).json({
        error: 'Invalid response from Odoo',
        details: authResponse.data
      });
    }

    const uid = authResponse.data.result;
    console.log(`[🟢] Autenticado con UID: ${uid}`);

    const domain = [
      ['type', '=', 'contact'],
      ['active', '=', true],
      ['subscription_ids.stage_id', 'in', [10]],
      ['subscription_ids.next_invoice_date', '>', '2025-06-1'],
      ['email', '!=', false],
      ['password_custom', '!=', false],
      ['sale_order_ids.order_line.product_id.product_variant_ids.id', '=', 2413],
      ['sale_order_ids.order_line.product_id.product_variant_ids.id', '=', 2415],
    ];

    console.log('[🟡] Buscando partners con suscripciones activas...');

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
          domain,
          [
            "id", "name", "email", "subscription_count",
            "user_ids", "customer", "parent_id", "active",
            "password_custom", "subscription_ids"
          ],
          0,
          TEST_MODE ? TEST_LIMIT : 0
        ]
      },
      id: requestId++
    }, {
      timeout: 30000
    });

    if (!partnersResponse.data || !partnersResponse.data.result) {
      console.error('[🔴] Error obteniendo partners');
      return res.status(502).json({
        error: 'Invalid partners response',
        details: partnersResponse.data
      });
    }

    const partners = partnersResponse.data.result;
    console.log(`[ℹ️] Encontrados ${partners.length} partners con suscripciones activas`);

    const problematicPartners = [];
    const problemStats = {
      SIN_USUARIO: 0,
      EMAIL_INCORRECTO: 0,
      VINCULACION_INCORRECTA: 0,
      USUARIO_INACTIVO: 0,
      CORRECCIONES_APLICADAS: 0,
      CORRECCIONES_FALLIDAS: 0
    };

    for (const partner of partners) {
      try {
        const partnerLog = `Partner ID ${partner.id} (${partner.email})`;
        const problems = [];
        const corrections = [];
        let needsCorrection = false;
        let correctionApplied = false;
        let correctionFailed = false;

        // 1. Verificar si tiene usuario asociado
        if (!partner.user_ids || partner.user_ids.length === 0) {
          problems.push("SIN_USUARIO");
          problemStats.SIN_USUARIO++;
          needsCorrection = true;

          if (!DRY_RUN) {
            try {
              console.log(`[🛠️] Intentando crear usuario para ${partnerLog}`);
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
                      "name": partner.name,
                      "login": partner.email,
                      "partner_id": partner.id,
                      "share": true,
                      "company_id": 1,
                      "company_ids": [1],
                      "groups_id": [24, 10, 87, 45]
                    }]
                  ]
                },
                id: requestId++
              });

              if (createResponse.data.result) {
                console.log(`[✅] Usuario creado para ${partnerLog}`);
                correctionApplied = true;
                problemStats.CORRECCIONES_APLICADAS++;
              } else {
                console.error(`[❌] Fallo al crear usuario para ${partnerLog}`);
                correctionFailed = true;
                problemStats.CORRECCIONES_FALLIDAS++;
              }
            } catch (error) {
              console.error(`[❌] Error al crear usuario para ${partnerLog}:`, error.message);
              correctionFailed = true;
              problemStats.CORRECCIONES_FALLIDAS++;
            }
          }

          corrections.push({
            type: "CREAR_USUARIO",
            description: "Crear usuario portal para el partner",
            status: DRY_RUN ? "Pendiente (DRY_RUN)" :
              correctionApplied ? "Aplicada" :
                correctionFailed ? "Fallida" : "No intentada"
          });
        } else {
          // 2. Obtener información del usuario asociado
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
                [["id", "=", partner.user_ids[0]]],
                ["id", "login", "partner_id", "active"],
                0,
                1
              ]
            },
            id: requestId++
          }, {
            timeout: 15000
          });

          const user = userResponse.data.result && userResponse.data.result[0];

          if (user) {
            // 3. Verificar coincidencia de email
            if (user.login.toLowerCase() !== partner.email.toLowerCase()) {
              problems.push("EMAIL_INCORRECTO");
              problemStats.EMAIL_INCORRECTO++;
              needsCorrection = true;

              if (!DRY_RUN) {
                try {
                  console.log(`[🛠️] Actualizando email para usuario ${user.id}`);
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
                        [user.id],  // Array con el ID del usuario
                        {           // Campos a actualizar
                          "login": partner.email
                        }
                      ]
                    },
                    id: requestId++
                  });

                  if (updateResponse.data.result) {
                    console.log(`[✅] Email actualizado para usuario ${user.id}`);
                    correctionApplied = true;
                    problemStats.CORRECCIONES_APLICADAS++;
                  } else {
                    console.log(updateResponse.data)
                    console.error(`[❌] Fallo al actualizar email para usuario ${user.id}`);
                    correctionFailed = true;
                    problemStats.CORRECCIONES_FALLIDAS++;
                  }
                } catch (error) {
                  console.error(`[❌] Error al actualizar email:`, error.message);
                  correctionFailed = true;
                  problemStats.CORRECCIONES_FALLIDAS++;
                }
              }

              corrections.push({
                type: "ACTUALIZAR_EMAIL",
                description: "Actualizar email del usuario",
                status: DRY_RUN ? "Pendiente (DRY_RUN)" :
                  correctionApplied ? "Aplicada" :
                    correctionFailed ? "Fallida" : "No intentada"
              });
            }

            // 4. Verificar vinculación correcta
            if (user.partner_id[0] !== partner.id) {
              problems.push("VINCULACION_INCORRECTA");
              problemStats.VINCULACION_INCORRECTA++;
              needsCorrection = true;

              if (!DRY_RUN) {
                try {
                  console.log(`[🛠️] Corrigiendo vinculación para usuario ${user.id}`);
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
                        [[user.id], {
                          "partner_id": partner.id
                        }]
                      ]
                    },
                    id: requestId++
                  });

                  if (updateResponse.data.result) {
                    console.log(`[✅] Vinculación corregida para usuario ${user.id}`);
                    correctionApplied = true;
                    problemStats.CORRECCIONES_APLICADAS++;
                  } else {
                    console.error(`[❌] Fallo al corregir vinculación para usuario ${user.id}`);
                    correctionFailed = true;
                    problemStats.CORRECCIONES_FALLIDAS++;
                  }
                } catch (error) {
                  console.error(`[❌] Error al corregir vinculación:`, error.message);
                  correctionFailed = true;
                  problemStats.CORRECCIONES_FALLIDAS++;
                }
              }

              corrections.push({
                type: "CORREGIR_VINCULACION",
                description: "Vincular usuario al partner correcto",
                status: DRY_RUN ? "Pendiente (DRY_RUN)" :
                  correctionApplied ? "Aplicada" :
                    correctionFailed ? "Fallida" : "No intentada"
              });
            }
          }
        }

        if (problems.length > 0) {
          problematicPartners.push({
            partner_id: partner.id,
            partner_name: partner.name,
            partner_email: partner.email,
            problems: problems,
            corrections: corrections,
            subscription_count: partner.subscription_count,
            next_invoice_date: partner.subscription_ids?.[0]?.next_invoice_date || null,
            _status: DRY_RUN ? "Simulado (DRY_RUN)" :
              correctionApplied ? "Corrección aplicada" :
                correctionFailed ? "Corrección fallida" : "Sin acción"
          });
          console.log(`[⚠️] ${partnerLog} - Problemas: ${problems.join(', ')}`);
        }
      } catch (error) {
        console.error(`[❌] Error procesando partner: ${error.message}`);
      }
    }

    const response = {
      success: true,
      config: {
        test_mode: TEST_MODE,
        test_limit: TEST_LIMIT,
        dry_run: DRY_RUN,
        message: DRY_RUN ? "Modo simulación - No se realizaron cambios" : "Modo activo - Cambios aplicados"
      },
      stats: {
        total_partners_scanned: partners.length,
        partners_con_problemas: problematicPartners.length,
        ...problemStats,
        porcentaje_problemas: partners.length > 0 ?
          `${((problematicPartners.length / partners.length) * 100).toFixed(2)}%` : "0%"
      },
      problematic_partners: problematicPartners,
      metadata: {
        execution_time: new Date(),
        filters_applied: domain,
        odoo_uid: uid
      }
    };

    console.log('[🟢] Enviando respuesta');
    res.json(response);

  } catch (error) {
    console.error('[🔴] Error en getProblematicPartners:', error);

    res.status(500).json({
      success: false,
      error: "Error en el servidor",
      details: error.message,
      timestamp: new Date()
    });
  }
};