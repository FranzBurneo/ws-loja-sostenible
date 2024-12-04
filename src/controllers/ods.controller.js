const {dbAdmin} = require("../firebaseAdmin");

export const getAllOds = async(req, res) =>{
    try {
        const odsCollectionRef = dbAdmin.collection("ods")
        const odsQuerySnapshot = await odsCollectionRef
        .orderBy("number")
        .get();
    
        if(odsQuerySnapshot.empty){
            return res.status(404).json({ message: 'El listado de ODS se encuentra vacío' });
        }
    
        const ods = odsQuerySnapshot.docs.map((odsDoc) => ({
            id: odsDoc.id,
            ...odsDoc.data(),
        }));
        res.status(200).json({ods})        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const addOds = async (req, res) => {
    try {
        const { name, title, description, number, toShow, cardImage, logoImage, color, large_description, route } = req.body;

        // Validar los campos requeridos
        if (!name || !title || !description || !number) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos obligatorios.' });
        }

        const newOds = {
            name,
            title,
            description,
            number,
            toShow: toShow || '',
            cardImage: cardImage || '',
            logoImage: logoImage || '',
            color: color || '',
            large_description: large_description || '',
            route: route || ''
        };

        // Agregar el nuevo documento a la colección ODS
        const odsCollectionRef = dbAdmin.collection('ods');
        const odsDocRef = await odsCollectionRef.add(newOds);

        res.status(201).json({
            message: 'ODS agregado exitosamente',
            id: odsDocRef.id
        });
    } catch (error) {
        console.error('Error al agregar ODS:', error);
        res.status(500).json({ message: 'Ocurrió un error al agregar el ODS.' });
    }
};

export const updateOdsById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, title, description, number, toShow, cardImage, logoImage, color, large_description, route } = req.body;

        // Validar que el ID y los campos requeridos existan
        if (!id || !name || !title || !description || !number) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos obligatorios.' });
        }

        const updatedOds = {
            name,
            title,
            description,
            number,
            toShow: toShow || '',
            cardImage: cardImage || '',
            logoImage: logoImage || '',
            color: color || '',
            large_description: large_description || '',
            route: route || ''
        };

        const odsDocRef = dbAdmin.collection('ods').doc(id);

        // Verificar si el documento existe
        const odsDocSnapshot = await odsDocRef.get();
        if (!odsDocSnapshot.exists) {
            return res.status(404).json({ message: 'ODS no encontrado' });
        }

        // Actualizar el documento
        await odsDocRef.update(updatedOds);

        res.status(200).json({ message: 'ODS actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar ODS:', error);
        res.status(500).json({ message: 'Ocurrió un error al actualizar el ODS.' });
    }
};

export const deleteOdsById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID exista
        if (!id) {
            return res.status(400).json({ message: 'Se requiere el ID del ODS para eliminarlo.' });
        }

        const odsDocRef = dbAdmin.collection('ods').doc(id);

        // Verificar si el documento existe
        const odsDocSnapshot = await odsDocRef.get();
        if (!odsDocSnapshot.exists) {
            return res.status(404).json({ message: 'ODS no encontrado' });
        }

        // Eliminar el documento
        await odsDocRef.delete();

        res.status(200).json({ message: 'ODS eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar ODS:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar el ODS.' });
    }
};