const { Router } = require('express');
const router = Router();
const newAuthController = require("../controllers/newAuthController")
const controllers = require("../controllers");

 router.route("/getAll").post(controllers.getAllTodos);
 router.route("/getSales").post(controllers.getAllSales);
 router.route("/getSub").post(controllers.getSub);
 router.route("/getOrderLines").post(controllers.getOrderLines);
 router.route("/getInvoices").post(controllers.getInvoices);
 router.route("/getCons").post(controllers.getCons);
 router.route("/logIn").post(controllers.logInv2);
 router.route("/logInPrueba").post(newAuthController.logIn);
 router.route("/cambioPass").post(newAuthController.cambioPass);
 router.route("/createUser").post(newAuthController.createUser);
 router.route("/schedule").post(controllers.schedule);
 router.route('/getJobs').get(controllers.getJobs)
module.exports = router;