const express = require('express');
const app = express();
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const AppError = require('./utils/appError');

require('dotenv').config();

// Configuraciones
app.set('port', process.env.PORT || 4000);

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
// Rutas
app.use(require('./routes/index'));

// Capturar rutas inexistentes (404)
app.all("*", (req, res, next) => {
    next(new AppError(`La URL ${req.originalUrl} no existe.`, 404));
});


app.use((err, req, res, next) => {
    if (err instanceof AppError && err.statusCode === 404) {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    } else {
        res.status(err.statusCode || 500).json({
            status: 'error',
            message: err.message || 'Error interno del servidor',
        });
    }
});
// app.get('/tabla-inpc', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public/tabla-inpc.html'));
// });
app.listen(app.get('port'), () => {
    console.log(`Server listening on port ${app.get('port')}`);
});

const programmedJobsPath = 'programmedJobs.json';
fs.writeFile(programmedJobsPath, '[]', 'utf8')
  .then(() => console.log('Archivo reiniciado al iniciar el servidor'))
  .catch(error => console.error('Error al reiniciar el archivo:', error.message));
