# Proyecto Missions

Este README proporciona las instrucciones para la instalación y configuración del proyecto Missions, basado en Node.js y PostgreSQL.

## Requisitos

- Node.js versión 21 o superior
- PostgreSQL versión 16 o superior

## Instalación

1. **Clonar el repositorio**

   ```sh
   git clone https://github.com/onejulian/missions.git
   cd missions
   ```

2. **Instalar dependencias**

   ```sh
   npm install
   ```

3. **Configurar la base de datos**

   - Crear una base de datos en local con el nombre `missions`.
   - Ejecutar el script `database.sql` para crear las tablas necesarias.

4. **Configurar el archivo `.env`**

   Crear un archivo `.env` en la base del proyecto con los datos de conexión a la base de datos. Ejemplo:

   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_DATABASE=missions
   DB_PASSWORD=
   DB_PORT=5432
   ```

5. **Crear la carpeta `uploads`**

   ```sh
   mkdir uploads
   ```

6. **Ejecutar la aplicación**

   ```sh
   node index.js
   ```

7. **Abrir la página web**

   Visitar [http://localhost:3000](http://localhost:3000) en el navegador.

