const { Router } = require('express');
const router = Router();
const controllers = require("../controllers");

// app.use(express.json());

//Raiz
// router.get('/', (req, res) => {    
//     res.json(
//         {
//             "Title": ""
//         }
//     );
// })
// // Ruta
// router.get('/userdata', function(req, res) {
//     res.json({
//       number: 1,
//       name: 'John',
//       gender: 'male'
//     });
//   });
 router.route("/getAll").post(controllers.getAllTodos);
 router.route("/getSales").post(controllers.getAllSales);
 router.route("/getSub").post(controllers.getSub);
 router.route("/getOrderLines").post(controllers.getOrderLines);
 router.route("/getInvoices").post(controllers.getInvoices);
 router.route("/getCons").post(controllers.getCons);
 router.route("/logIn").post(controllers.logIn);
 router.route("/schedule").post(controllers.schedule);
 router.route('/getJobs').get(controllers.getJobs)
module.exports = router;