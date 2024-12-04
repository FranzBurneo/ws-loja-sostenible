const {dbAdmin} = require("../firebaseAdmin");
const firebase = require('firebase-admin');
const {storage} = require('@google-cloud/storage');

export const getForms = async (req, res) =>{
    try {
        const page = req.query.page || 1; // Página predeterminada es 1 si no se proporciona el parámetro
        
        const maxPerPage = 10;
        const lastItemIndex = (page - 1) * maxPerPage;
        
        const querySnapshot = await dbAdmin.collection("forms")
            .orderBy("timestamp")
            .startAfter(lastItemIndex) // Usa el índice en lugar del valor
            .limit(maxPerPage)
            .get();
            
        const forms = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            description: doc.data().description,
            title: doc.data().title,
            timestamp: doc.data().timestamp,
        }));
        
        res.status(200).json({ forms });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const getResponsesFormById = async (req, res) =>{
    try {
        const formCollectionRef = dbAdmin.collection("forms").doc(req.params.formId);
        const formDoc = await formCollectionRef.get();
        
        if (!formDoc.exists) {
            return res.status(404).json({ message: 'No se encontró el formulario' });
        }

        const formData = formDoc.data();

        const ResponsesCollectionRef = dbAdmin.collection("formResponses");
        
        const querySnapshot = await ResponsesCollectionRef.where("formId", "==", req.params.formId).get();
        if (querySnapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron respuestas del formulario' });
        }
        const formResponses = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Objeto para almacenar el resumen de respuestas
        const summary = {};
        let totalResponses = 0;
        let verifiedResponses = 0; // Contador para respuestas verificadas

        // Iterar sobre todas las respuestas individuales
        formResponses.forEach(response => {
            totalResponses++; // Incrementar el contador total de respuestas
            console.log('getResponsesFormById response: ', response)
            // Verificar si el usuario está verificado
            if (response.hasOwnProperty('verifiedUser') && response.verifiedUser === true) {
                verifiedResponses++; // Incrementar el contador de respuestas verificadas
            }

            response.questions.forEach(question => {
                if (!summary.hasOwnProperty(question.question)) {
                    // Si la pregunta no está en el resumen, agregarla
                    summary[question.question] = {
                        count: 0,
                        verifiedCount: 0, // Inicializar contador para respuestas verificadas
                        answers: {}
                    };
                }
                // Incrementar el contador de respuestas para la pregunta
                summary[question.question].count++;

                // Verificar si la respuesta ya está en el resumen de respuestas para esta pregunta
                if (!summary[question.question].answers.hasOwnProperty(question.answeredText)) {
                    // Si la respuesta no está en el resumen, agregarla con un contador inicial de 1
                    summary[question.question].answers[question.answeredText] = {
                        count: 1,
                        verifiedCount: response.hasOwnProperty('verifiedUser') && response.verifiedUser === true ? 1 : 0 // Verificar si la respuesta está verificada
                    };
                } else {
                    // Si la respuesta ya está en el resumen, aumentar el contador
                    summary[question.question].answers[question.answeredText].count++;

                    // Verificar si la respuesta está verificada y aumentar el contador correspondiente
                    if (response.hasOwnProperty('verifiedUser') && response.verifiedUser === true) {
                        summary[question.question].answers[question.answeredText].verifiedCount++;
                    }
                }
            });
        });

        // Crear una estructura final del resumen con el formato deseado
        const finalSummary = {
            totalResponses: totalResponses,
            verifiedResponses: verifiedResponses,
            summary: Object.keys(summary).map(question => ({
                question,
                answers: {
                    count: summary[question].count,
                        answers: Object.keys(summary[question].answers).map(answer => ({
                        answer,
                        count: summary[question].answers[answer].count,
                        verifiedCount: summary[question].answers[answer].verifiedCount // Agregar recuento de respuestas verificadas
                    }))
                }
            }))
        };

        // Devolver el resumen junto con las respuestas individuales y el número total de respuestas
        res.status(200).json({ 
            formTitle: formData.title, 
            formDescription: formData.description, 
            formSelectedOds: formData.selectedOds,
            formTimestamp: formData.timestamp, 
            formResponses, 
            summary: finalSummary });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const createResponseForm = async (req, res) => {
    try {
        console.log('createResponseForm: ', req.body)
        // Extraer campos del cuerpo de la solicitud
        const request = req.body;
    
        // Crear un objeto de fecha y hora usando Timestamp
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        console.log({
            ...request,
            timestamp
        })

        // Falta guardar el id del usuario que responde
        await dbAdmin.collection("formResponses").add({
            ...request,
            timestamp
          });
    
        // Enviar una respuesta al cliente
        return res.status(201).json({ message: 'Respuesta agregada con éxito' });

    } catch (error) {        
        return res.status(500).json({message: 'Error al intentar guardar sus respuestas, intente más tarde'})
    }
}

export const updateFormById = async (req, res) =>{
    try {
        // Extraer campos del cuerpo de la solicitud
        const { title, content, type } = req.body;
    
        const formCollectionRef = dbAdmin.collection("forms").doc(req.params.formId);
        
        // Obtener la información de la publicación
        const formDoc = await formCollectionRef.get();

        // Verificar si la publicación existe
        if (!formDoc.exists) {
            return res.status(404).json({ message: 'La publicación con el ID proporcionado no existe.' });
        }

        // Obtener el userID del documento de la publicación
        const formUserId = formDoc.data().userId;

        // Verificar si el usuario que hace la petición es el mismo que creó la publicación
        if (req.userId !== formUserId) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar esta publicación.' });
        }

        // Crear un objeto de fecha y hora usando Timestamp
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        // Obtener el archivo de imagen desde la solicitud
        const imageFile = req.files && req.files.image;

        // Guardar la imagen en el almacenamiento de Firebase
        let imageUrl = null;
        if (imageFile) {
            const bucket = storage.bucket('images');
            const fileName = `images/${Date.now()}_${imageFile.name}`;
            const file = bucket.file(fileName);
    
            await file.save(imageFile.data);
            imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }

        // Actualizar la publicación
        await dbAdmin.collection("forms").update({
            title,
            description,
            questions,
            options,
            timestamp, // Usar el nombre correcto del campo "timestamp"
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