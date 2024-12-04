const {dbAdmin} = require("../firebaseAdmin");
const firebase = require('firebase-admin');
const {storage} = require('@google-cloud/storage');

export const getForms = async (req, res) =>{
    try {
        const page = req.query.iterator || 1; // Página predeterminada es 1 si no se proporciona el parámetro
        console.log('page2: ', req.query.iterator);

        const maxPerPage = 5;

        let formQuery = dbAdmin.collection("forms");

        // Consulta los documentos donde el campo "visibility" es true o el campo no está presente
        formQuery = formQuery.where("visibility", "==", true).orderBy('timestamp', 'desc');

        // Verifica si se desea obtener solo las publicaciones del usuario loggeado
        if (req.query.onlyOwnPosts === 'true') {
            // Filtra las publicaciones por el ID de usuario loggeado
            const userId = req.query.userId; // Se asume que el ID de usuario está en req.userId
            if (userId) {
                formQuery = formQuery.where("userId", "==", userId);
            } else {
                // Manejar el caso donde req.userId es undefined
                console.error('El ID de usuario no está disponible en la solicitud.');
                res.status(400).json({ message: 'El ID de usuario no está disponible en la solicitud.' });
                return;
            }
        }

        // Si no es la primera página, utiliza el último documento como referencia
        if (page > 1) {
            const lastDocument = await getLastDocument(page);
            formQuery = formQuery.startAfter(lastDocument);
        }
        const formQuerySnapshot = await formQuery.limit(maxPerPage).get();
        const forms = [];
        
        for (const doc of formQuerySnapshot.docs) {
            const formData = doc.data();
            const selectedOdsId = formData.selectedOds;
            const userIdForm = formData.userId;
            let selectedOdsData = {};
            let dataUserForm = {};

            if (selectedOdsId) {
                const odsDoc = await dbAdmin.collection("ods").doc(selectedOdsId).get();
                selectedOdsData = odsDoc.data();
            }

            if (userIdForm) {
                const usersCollectionRef = dbAdmin.collection("users");
                const userDataSnapshot = await usersCollectionRef.where("userId", "==", userIdForm).get();
                if (!userDataSnapshot.empty) {
                    dataUserForm = userDataSnapshot.docs[0].data();
                } else {
                    console.error(`No se encontró ningún usuario con el ID: ${userIdForm}`);
                }
            }

            const form = {
                id: doc.id,
                ...formData,
                selectedOds: selectedOdsData,
                userPost: dataUserForm
            };
            forms.push(form);
        }
        
        res.status(200).json({ forms });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}
    
const getLastDocument = async (page) => {
    try {
        const maxPerPage = 3;
        const offset = (page - 1) * maxPerPage;

        // Realiza una consulta para obtener el último documento de la página anterior
        const formQuerySnapshot = await dbAdmin.collection("forms")
            .orderBy('timestamp', 'desc')
            .limit(offset)
            .get();

        // Si hay documentos, el último será el que se utilizará como referencia
        if (!formQuerySnapshot.empty) {
            return formQuerySnapshot.docs[formQuerySnapshot.docs.length - 1];
        } else {
            throw new Error('No se encontraron documentos para la página especificada.');
        }
    } catch (error) {
        console.error('Error obteniendo el último documento:', error);
        throw new Error('Ocurrió un error al obtener el último documento.');
    }
};

export const getFormById = async (req, res) =>{
    try {
        const docRef = dbAdmin.collection("forms").doc(req.params.formId);
        const doc = await docRef.get();
        let dataUserForm = {};

        if (doc.exists) {
            const formData = doc.data();
            const userIdForm = formData.userId;

            const usersFormCollectionRef = dbAdmin.collection("users");
            const userDataFormSnapshot = await usersFormCollectionRef.where("userId", "==", userIdForm).get();
            if (!userDataFormSnapshot.empty) {
                dataUserForm = userDataFormSnapshot.docs[0].data();
                console.log('dataUserForm: ', dataUserForm);
            } else {
                console.error(`No se encontró ningún usuario con el ID: ${userIdForm}`);
            }
            // El documento existe, devolver sus datos
            res.status(200).json({ form: { id: doc.id, ...doc.data(), userForm: dataUserForm } });
        } else {
            // El documento no existe
            res.status(404).json({ message: 'El documento no fue encontrado.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const createForm = async (req, res) => {
    try {
        
        // Extraer campos del cuerpo de la solicitud
        const { title, description, questions, options, selectedOds, interactionType } = req.body;
    
        // Crear un objeto de fecha y hora usando Timestamp
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        // Guardar form
        const docRef = await dbAdmin.collection("forms").add({
            title,
            description,
            questions,
            options,
            userId: req.userId,
            selectedOds,
            timestamp, // Usar el nombre correcto del campo "timestamp"
            visibility: true,
            interactionType
          });

        // Obtener el ID del documento creado
        const formId = docRef.id;

        // Devolver el ID del documento junto con la URL de la imagen
        res.status(200).json({ success: true, formId });

    } catch (error) {
        console.log('create form error: ', error)
        return res.status(500).json({message: 'Error al intentar agregar el formulario, intente más tarde'})
    }
}

export const updateFormById = async (req, res) =>{
    try {
        // Extraer campos del cuerpo de la solicitud
        const { title, description, questions, options, selectedOds, visibility} = req.body;
    
        const formCollectionRef = dbAdmin.collection("forms").doc(req.params.formId);
        
        // Obtener la información de la encuesta
        const formDoc = await formCollectionRef.get();

        // Verificar si la encuesta existe
        if (!formDoc.exists) {
            return res.status(404).json({ message: 'La encuesta con el ID proporcionado no existe.' });
        }

        // Obtener el userID del documento de la encuesta
        const formUserId = formDoc.data().userId;

        // Verificar si el usuario que hace la petición es el mismo que creó la encuesta
        if (req.userId !== formUserId) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar esta encuesta.' });
        }
        
        // Opción para solo actualizar la visibilidad
        if (visibility !== undefined) {
            // Actualizar la visibilidad
            await formCollectionRef.update({
                visibility: visibility
            });
            res.status(200).json({ message: 'Visibilidad actualizada correctamente' });
            return;
        }

        // Crear un objeto de fecha y hora usando Timestamp
        // const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        // Actualizar la encuesta
        await dbAdmin.collection("forms").update({
            title,
            description,
            questions,
            options,
            selectedOds, // Usar el nombre correcto del campo "timestamp"
         });

        res.status(200).json({ message: 'Formulario actualizada correctamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar el formulario.' });
    }
}
export const deleteFormById = async (req, res) => {
    try {
        const formCollectionRef = dbAdmin.collection("forms").doc(req.params.formId);
        
        // Obtener la información de la publicación
        const formDoc = await formCollectionRef.get();

        // Verificar si la publicación existe
        if (!formDoc.exists) {
            return res.status(404).json({ message: 'El formulario con el ID proporcionado no existe.' });
        }

        // Obtener el userID del documento de la publicación
        const formUserId = formDoc.data().userId;

        // Verificar si el usuario que hace la petición es el mismo que creó la publicación
        if (req.userId !== formUserId) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar este formulario.' });
        }

        // Eliminar la publicación
        await formCollectionRef.delete();

        res.status(200).json({ message: 'Formulario eliminada correctamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar el formulario.' });
    }
};