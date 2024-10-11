// Importar librerías necesarias
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// Configurar Express
const app = express();
app.use(bodyParser.json());

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.use('/login', express.static('client/login.html'));
app.use('/missions', express.static('client/missions.html'));
app.use('/register', express.static('client/register.html'));

require('dotenv').config();

// Configurar base de datos PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
  }
});

// Configurar Multer para la carga de archivos multimedia
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(jpg|jpeg|png|gif)$/i;
    if (!allowedExtensions.test(file.originalname)) {
      return cb(new Error('Solo se permiten archivos con extensiones .jpg, .jpeg, .png, .gif'));
    }
    cb(null, true);
  }
});

// Middleware para autenticar al usuario
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token no válido' });
    }
    req.userId = user.userId; // Guardar el userId en la solicitud
    next();
  });
}

// Registrar usuario
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el usuario ya existe
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rowCount > 0) {
      return res.status(400).json({ error: 'El usuario ya está registrado' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario en la base de datos
    const result = await pool.query(
      'INSERT INTO users (nombre, email, password) VALUES ($1, $2, $3) RETURNING *',
      [nombre, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar sesión
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el usuario existe
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rowCount === 0) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign({ userId: user.rows[0].id }, 'secret_key', { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cerrar sesión
app.post('/api/logout', authenticateToken, (req, res) => {
  // En un sistema basado en JWT, no se puede invalidar el token en el servidor directamente.
  // Sin embargo, se puede manejar desde el lado del cliente eliminando el token almacenado.
  res.status(200).json({ message: 'Sesión cerrada correctamente' });
});

// Obtener lista de misiones
app.get('/api/misiones', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query('SELECT * FROM missions WHERE created_by = $1', [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear una nueva misión
app.post('/api/misiones', authenticateToken, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const createdBy = req.userId;

    if (!nombre || !descripcion) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Insertar nueva misión en la base de datos
    const result = await pool.query(
      'INSERT INTO missions (nombre, descripcion, created_by) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion, createdBy]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener diario del usuario
app.get('/api/diario', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diario_usuario WHERE user_id = $1', [req.userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener actualizaciones de una misión
app.get('/api/misiones/:missionId/actualizaciones', authenticateToken, async (req, res) => {
  try {
    const { missionId } = req.params;
    const userId = req.userId;

    // Validar que la misión pertenezca al usuario autenticado
    const mission = await pool.query('SELECT * FROM missions WHERE id = $1 AND created_by = $2', [missionId, userId]);
    if (mission.rowCount === 0) {
      return res.status(404).json({ error: 'Misión no encontrada o no pertenece al usuario' });
    }

    // Obtener las actualizaciones de la misión
    const result = await pool.query('SELECT * FROM progreso_mision WHERE mission_id = $1', [missionId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Validación: Comprobar que el usuario y la misión existen
async function validateUserAndMission(userId, missionId) {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const mission = await pool.query('SELECT * FROM missions WHERE id = $1', [missionId]);
  if (user.rowCount === 0) {
    throw new Error('Usuario no encontrado');
  }
  if (mission.rowCount === 0) {
    throw new Error('Misión no encontrada');
  }
}

// Registrar el progreso de la misión
app.post('/api/progreso', authenticateToken, upload.single('imagen'), async (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ error: req.fileValidationError });
  }
  try {
    const { missionId, estado, puntaje, fechaFinalizacion, informacionAdicional, imagenDescripcion } = req.body;
    const userId = req.userId;

    // Validar datos
    if (!missionId || !estado || !puntaje || puntaje < 0 || puntaje > 100) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    await validateUserAndMission(userId, missionId);

    // Insertar progreso en la base de datos
    const result = await pool.query(
      `INSERT INTO progreso_mision (user_id, mission_id, estado, puntaje, fecha_finalizacion, informacion_adicional, imagen_ruta, imagen_descripcion) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        missionId,
        estado,
        puntaje,
        fechaFinalizacion,
        informacionAdicional,
        req.file ? req.file.path : null,
        imagenDescripcion
      ]
    );

    // Guardar resumen en el diario del usuario
    await pool.query(
      `INSERT INTO diario_usuario (user_id, resumen) VALUES ($1, $2)`,
      [userId, `Misión ${missionId} - Estado: ${estado}, Puntaje: ${puntaje}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Previsualización de datos ingresados
app.post('/api/previsualizar', authenticateToken, upload.single('imagen'), (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ error: req.fileValidationError });
  }
  try {
    const { missionId, estado, puntaje, fechaFinalizacion, informacionAdicional, imagenDescripcion } = req.body;
    const userId = req.userId;

    if (!missionId || !estado || !puntaje || puntaje < 0 || puntaje > 100) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const previsualizacion = {
      userId,
      missionId,
      estado,
      puntaje,
      fechaFinalizacion,
      informacionAdicional,
      imagen: req.file ? req.file.path : null,
      imagenDescripcion
    };

    res.status(200).json(previsualizacion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Manejo de errores para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:3000`)
});