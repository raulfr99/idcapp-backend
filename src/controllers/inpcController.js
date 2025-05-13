const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/inpcData.json');

// Función para actualizar un valor específico
async function updateINPCValue(req, res) {
  const { year, month, value } = req.body;
  
  // Validaciones básicas
  if (!year || !month || value === undefined || isNaN(value)) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  try {
    // Leer el archivo actual
    const rawData = fs.readFileSync(DATA_FILE);
    const data = JSON.parse(rawData);

    // Buscar el año
    const yearIndex = data.findIndex(item => item.year == year);
    if (yearIndex === -1) {
      return res.status(404).json({ error: 'Año no encontrado' });
    }

    // Verificar que el mes sea válido
    const validMonths = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    if (!validMonths.includes(month)) {
      return res.status(400).json({ error: 'Mes no válido' });
    }

    // Actualizar el valor
    data[yearIndex].months[month] = parseFloat(value);

    // Guardar los cambios
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    // Responder con éxito
    res.json({ 
      success: true,
      year: data[yearIndex].year,
      month,
      newValue: data[yearIndex].months[month]
    });

  } catch (error) {
    console.error('Error al actualizar INPC:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Función para obtener todos los datos
async function getINPCData(req, res) {
  try {
    const rawData = fs.readFileSync(DATA_FILE);
    const data = JSON.parse(rawData);
    res.json(data);
  } catch (error) {
    console.error('Error al leer datos INPC:', error);
    res.status(500).json({ error: 'Error al cargar los datos' });
  }
}

module.exports = {
  updateINPCValue,
  getINPCData
};