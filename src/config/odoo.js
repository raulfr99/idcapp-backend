const Odoo = require('odoo-xmlrpc');
require('dotenv').config();

const odoo = new Odoo({
    url: process.env.ODOO_URL,
    db: process.env.DB_NAME,
    username: process.env.ODOO_USERNAME,
    password: process.env.ODOO_PASSWORD,
});

const connectOdoo = () => {
    return new Promise((resolve, reject) => {
        odoo.connect((err) => {
            if (err) {
                reject(`Error connecting to Odoo: ${err}`);
            } else {
                console.log('Connected to Odoo server');
                resolve(odoo);
            }
        });
    });
};

module.exports = { odoo, connectOdoo };
