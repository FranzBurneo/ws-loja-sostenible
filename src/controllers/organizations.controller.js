const {dbAdmin, bucket} = require("../firebaseAdmin");
const firebase = require('firebase-admin');
const axios = require ('axios');
const {NODE_API} = require('../config');

export const getOrganizations = async (req, res) => {
    try {
        const querySnapshot = await dbAdmin.collection("organizations").get();
        const organizations = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json({ organizations });
    } catch (error) {
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

// Función para guardar la imagen en el almacenamiento de Firebase
async function guardarImagen(imageData, fileName) {
    const uniqueFileName = `OrganizationAvatars/${fileName}`;

    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const file = bucket.file(uniqueFileName);
    //save image into storage
    await file.save(buffer, {
        metadata: {
            contentType: 'image/png', // O 'image/jpeg'
        },
    });
    
    //get URL from img
    const url = NODE_API + 'img';
    const req = {
        imgName: uniqueFileName
      };

    const responseImg = await axios.post(url, req);
    return responseImg.data.url;
}

export const createOrganization = async (req, res) => {
    try {
        const { name, description, location, contactNumber, organizationType, avatarImage } = req.body;

        // validar campos obligatorios
        if(name === '' || location === '' || contactNumber === '' || organizationType === ''){
            return res.status(400).json({message: "No se proporcionó información en todos los campos obligatorios"});
        }
        
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        const url = avatarImage ? await guardarImagen(avatarImage, name) : null;

        // Guardar detalles de la organización en una colección
        dbAdmin.collection("organizations").add({
            name,
            description,
            location,
            contactNumber,
            timestamp,
            organizationType,
            active: true,
            ...(avatarImage && {avatarImage: url}) 
        });
    
        return res.status(201).json({ message: 'Organización creada correctamente' });
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Ocurrió un error, intente nuevamente más tarde"});
    }
}

export const updateOrganizationById = async (req, res) =>{
    try {
        const { name, description, location, contactNumber, active, organizationType, avatarImage } = req.body;

        
        const organizationCollectionRef = dbAdmin.collection("organizations").doc(req.params.organizationId);

        // Obtener la información de la publicación
        const organizationDoc = await organizationCollectionRef.get();

        // Verificar si la publicación existe
        if (!organizationDoc.exists) {
            return res.status(404).json({ message: 'La organización con el ID proporcionado no existe.' });
        }

        // Guardar la imagen en el almacenamiento de Firebase si se proporciona
        let imageUrl = null;
        if(avatarImage === "-1" || avatarImage === organizationDoc.data().avatarImage){
            imageUrl = organizationDoc.data().avatarImage;
        }else if (avatarImage) {
            imageUrl = await guardarImagen(avatarImage, name);
        }

        // Actualizar la publicación con todos los campos proporcionados
        await organizationCollectionRef.update({
            name,
            description,
            location,
            contactNumber,
            organizationType,
            active,
            ...(avatarImage && {avatarImage: imageUrl}) 
        });
        // El documento existe, así que procede a actualizarlo
        res.status(200).json({ message: 'Organización editada correctamente' });
    } catch (error) {
        console.log('error: '+error)
        res.status(500).json({ message: 'Ocurrió un error al editar la organización' });
    }
}

export const deleteOrganizationById = async (req, res) =>{
    try {
        const organizationId = req.params.organizationId;
        console.log('deleteOrganizationById: ', organizationId);
        const organizationCollectionRef = dbAdmin.collection("organizations").doc(organizationId);
        
        // Obtener la información de la publicación
        const organizationDoc = await organizationCollectionRef.get();

        // Verificar si la publicación existe
        if (!organizationDoc.exists) {
            return res.status(404).json({ message: 'La organización con el ID proporcionado no existe.' });
        }
        // Eliminar la publicación
        await organizationCollectionRef.delete();

        res.status(200).json({ message: 'Formulario eliminada correctamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar la organización.' });
    }
}