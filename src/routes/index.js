const { Router } = require('express');
const router = Router();
const controllers = require("../controllers");

// app.use(express.json());

//Raiz
router.get('/', (req, res) => {    
    res.json(
        {
            "Title": "Hola mundo usando rutas!"
        }
    );
})
// Ruta
router.get('/userdata', function(req, res) {
    res.json({
      number: 1,
      name: 'John',
      gender: 'male'
    });
  });
 router.route("/getAll").post(controllers.getAllTodos);
 router.route("/getSales").post(controllers.getAllSales);
 router.route("/getSub").post(controllers.getSub);
 router.route("/getOrderLines").post(controllers.getOrderLines);
 router.route("/getInvoices").post(controllers.getInvoices);
module.exports = router;