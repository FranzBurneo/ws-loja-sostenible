const {dbAdmin} = require("../firebaseAdmin");
const firebase = require('firebase-admin');

export const createParticipation = async (req, res) => {
    try {
        const {postId} = req.body;

        const userId = req.userId;
        
        const usersCollectionRef = dbAdmin.collection("users");
        const userSnapshot = await usersCollectionRef.where("userId", "==", userId).get();

        if (userSnapshot.empty) {
            return res.status(404).json({ message: 'El usuario con el ID proporcionado no existe.' });
        }
        
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());
        const postCollectionRef = dbAdmin.collection("posts").doc(postId);

        // Obtener la información de la publicación
        const postDoc = await postCollectionRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ message: 'La publicación no fue encontrada.' });
        }

        // Guardar detalles del usuario en una colección
        dbAdmin.collection("postParticipants").add({
            postId,
            userId,
            timestamp
        });

        const postData = postDoc.data();
        console.log('postData: ', postData);
        const countParticipants = postData.countParticipants ? postData.countParticipants + 1 : 1;
        // Actualizar contador
        await postCollectionRef.update({
            countParticipants
        });
            
        return res.status(200).json({message: 'Participación registrada correctamente'})        
    } catch (error) {
        console.log('createParticipation Error: ', error);
        return res.status(500).json({message: "Ocurrió un error, intente nuevamente más tarde"});
    }
}


export const deleteParticipation = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.userId;
        console.log('postId: ', postId, ' userId: ', userId);
        // Busca y elimina todas las participaciones asociadas al postId y al userId
        const participationCollectionRef = dbAdmin.collection("postParticipants");
        const participationSnapshot = await participationCollectionRef.where("postId", "==", postId)
                                                                    .where("userId", "==", userId)
                                                                    .get();
        if (participationSnapshot.exists) {
            return res.status(404).json({ message: 'No se encontraron participaciones para el usuario y el post proporcionados.' });
        }
        // Elimina cada participación encontrada
        const deletePromises = participationSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        const postCollectionRef = dbAdmin.collection("posts").doc(postId);

        // Obtener la información de la publicación
        const postDoc = await postCollectionRef.get();
        if (postDoc.exists){
            const postData = postDoc.data();
            const countParticipants = postData.countParticipants && postData.countParticipants >= 0 ? postData.countParticipants - 1 : 0;
            // Actualizar contador
            await postCollectionRef.update({
                countParticipants
            });
        }

        return res.status(200).json({ message: 'Las participaciones fueron eliminadas correctamente.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar su participación.' });
    }
};