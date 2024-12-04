const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importa el middleware CORS
import postsRoutes from './src/routes/posts.routes'
import formsRoutes from './src/routes/forms.routes'
import answerFormsRoutes from './src/routes/answerForms.routes'
import authRoutes from './src/routes/auth.routes'
import usersRoutes from './src/routes/users.routes'
import commentsRoutes from './src/routes/comments.routes'
import imgRoutes from './src/routes/img.routes'
import odsRoutes from './src/routes/ods.routes'
import organizationsRoutes from './src/routes/organization.routes'
import participationRoutes from './src/routes/participation.routes'
import multer from 'multer'

const app = express();
const port = 3456;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Habilita CORS para permitir solicitudes desde dos sitios diferentes
const allowedOrigins = ['https://lojasosteniblenv.onrender.com', 'https://mellow-kheer-9135fc.netlify.app', 'http://localhost:3000'];
app.use(cors({ origin: allowedOrigins }));

// Configuración del límite de carga para express.json
app.use(express.json({ limit: '10mb' })); // Se cambia el tamaño del límite

// Configura el límite de carga para express.urlencoded
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Se cambia el tamaño del límite

app.use('/api/posts', upload.any(), postsRoutes)
app.use('/api/forms', formsRoutes)
app.use('/api/answerForms', answerFormsRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/comments', commentsRoutes)
app.use('/api/img', imgRoutes)
app.use('/api/ods', odsRoutes)
app.use('/api/organizations', organizationsRoutes)
app.use('/api/participation', participationRoutes)

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor en funcionamiento en el puerto ${port}`);
});
