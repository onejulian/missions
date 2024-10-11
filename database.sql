-- Crear tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Crear tabla de misiones
CREATE TABLE missions (
    created_by INTEGER NOT NULL REFERENCES users(id),
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Crear tabla de progreso de misión
CREATE TABLE progreso_mision (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mission_id INTEGER NOT NULL REFERENCES missions(id),
    estado VARCHAR(50) NOT NULL,
    puntaje INTEGER NOT NULL CHECK (puntaje >= 0 AND puntaje <= 100),
    fecha_finalizacion TIMESTAMP,
    informacion_adicional TEXT,
    imagen_ruta VARCHAR(255),
    imagen_descripcion TEXT
);

-- Crear tabla de diario del usuario
CREATE TABLE diario_usuario (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    resumen TEXT NOT NULL
);