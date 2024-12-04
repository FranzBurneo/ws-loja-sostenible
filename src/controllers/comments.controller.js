const {dbAdmin} = require("../firebaseAdmin");
const firebase = require('firebase-admin');

export const getComments = async (req, res) =>{
    try {
        const page = req.body.iterator || 1; // Página predeterminada es 1 si no se proporciona el parámetro
        
        const maxPerPage = 10;
        const lastItemIndex = page * maxPerPage;
        
        const querySnapshot = await dbAdmin.collection("comments")
            .orderBy("timestamp")
            .startAfter(lastItemIndex) // Usa el índice en lugar del valor
            .limit(maxPerPage)
            .get();
            
        const comments = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        
        res.status(200).json({ comments });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const getCommentByPostId = async (req, res) =>{
    try {
        const commentsCollectionRef = dbAdmin.collection("comments");
        const commentsQuerySnapshot = await commentsCollectionRef.where("postId", "==", req.params.postId).orderBy("timestamp", "desc").get();
        const commentsData = await Promise.all(commentsQuerySnapshot.docs.map(async (commentDoc) => {
            const commentData = commentDoc.data();
            const commentUserId = commentData.userId;
            let nameUserReplied;

            // Obtener los datos del usuario que comentó
            const userCommentDoc = await dbAdmin.collection("users").where("userId", "==", commentUserId).get();
            const userCommentData = userCommentDoc.empty ? {} : userCommentDoc.docs[0].data();

            // Obtener las respuestas del comentario
            const repliesQuerySnapshot = await dbAdmin.collection("commentReplies").where("commentId", "==", commentDoc.id).orderBy("timestamp", "asc").get();
            const repliesData = await Promise.all(repliesQuerySnapshot.docs.map(async (replyDoc) => {
                const replyData = replyDoc.data();
                const replyUserId = replyData.userId;
                const repliedUserId = replyData.repliedUserId;

                // Obtener los datos del usuario que respondió
                const userReplyDoc = await dbAdmin.collection("users").where("userId", "==", replyUserId).get();
                const userReplyData = userReplyDoc.empty ? {} : userReplyDoc.docs[0].data();
                if(repliedUserId){
                    const usersCollectionRef = dbAdmin.collection("users");
                    const userDataSnapshot = await usersCollectionRef.where("userId", "==", repliedUserId).get();
                    if(!userDataSnapshot.empty)
                        nameUserReplied = userDataSnapshot.docs[0].data().firstname + " "  + userDataSnapshot.docs[0].data().lastname
                }

                // Combinar la información del usuario y la respuesta en un objeto
                return {
                    id: replyDoc.id,
                    content: replyData.content,
                    timestamp: replyData.timestamp,
                    user: {
                        id: replyUserId,
                        firstname: userReplyData.firstname || 'Unknown',
                        lastname: userReplyData.lastname || 'Unknown',
                        profileImage: userReplyData.avatarImage || null,
                    },
                    nameUserReplied,
                };
            }));

            // Combinar la información del comentario, usuario y respuestas en un objeto
            return {
                id: commentDoc.id,
                postId: commentData.postId,
                content: commentData.content,
                timestamp: commentData.timestamp,
                user: {
                    id: commentUserId,
                    firstname: userCommentData.firstname || 'Unknown',
                    lastname: userCommentData.lastname || 'Unknown',
                    profileImage: userCommentData.avatarImage || null,
                },
                replies: repliesData
            };
        }));
        res.status(200).json({ comments: commentsData });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const createComment = async (req, res) => {
    try {
        
        // Extraer campos del cuerpo de la solicitud
        const { postId, content } = req.body;
    
        // Crear un objeto de fecha y hora usando Timestamp
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());
        await dbAdmin.collection("comments").add({
            postId,
            content,
            userId: req.userId,
            timestamp, // Usar el nombre correcto del campo "timestamp"
        });
    
        // Enviar una respuesta al cliente
        return res.status(201).json({ message: 'Comentario agregado con éxito' });

    } catch (error) {                
        console.log("error: ", error);
        return res.status(500).json({message: 'Error al intentar agregar el comentario, intente más tarde'})
    }
}

export const createCommentReply = async (req, res) => {
    try {
        // Extraer campos del cuerpo de la solicitud
        const { content } = req.body;

        const commentId = req.params.commentId;
        // Crear un objeto de fecha y hora usando Timestamp
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());
        // Verificar si el comentario al que se responde existe
        const commentRef = await dbAdmin.collection("comments").doc(commentId).get();
        if (!commentRef.exists) {
            const commentReplyRef = await dbAdmin.collection("commentReplies").doc(commentId).get();
            if(!commentReplyRef){
                return res.status(404).json({ message: 'El comentario al que está respondiendo no existe' });    
            }
            // Obtener el userId del comentario original
            const repliedUserId = commentReplyRef.data().userId;
            const originalCommentId = commentReplyRef.data().commentId;
            // Guardar la respuesta asociada al comentario
            await dbAdmin.collection("commentReplies").add({
                commentId: originalCommentId,
                content,
                userId: req.userId,
                repliedUserId,
                originalCommentId: commentId,
                timestamp,
            });
        }else{
            // Guardar la respuesta asociada al comentario
            await dbAdmin.collection("commentReplies").add({
                commentId,
                content,
                userId: req.userId,
                timestamp,
            });
        }
        // Enviar una respuesta al cliente
        return res.status(201).json({ message: 'Respuesta al comentario agregada con éxito' });

    } catch (error) {
        console.log("error: ", error);
        return res.status(500).json({ message: 'Error al intentar agregar la respuesta al comentario, intente más tarde' });
    }
}

export const updateCommentById = async (req, res) =>{
    try {
        // Extraer campos del cuerpo de la solicitud
        const { content } = req.body;
    
        const commentCollectionRef = dbAdmin.collection("comments").doc(req.params.commentId);        
        // Obtener la información del comentario
        const commentDoc = await commentCollectionRef.get();
        // Verificar si el comentario existe
        if (!commentDoc.exists) {
            const commentRepliesCollectionRef = dbAdmin.collection("commentReplies").doc(req.params.commentId);
            const commentRepliesDoc = await commentRepliesCollectionRef.get();
            if(!commentRepliesDoc.exists){
                return res.status(404).json({ message: 'El comentario con el ID proporcionado no existe.' });
            }
            // Obtener el userID del documento de la publicación
            const commentUserId = commentRepliesDoc.data().userId;            
            // Verificar si el usuario que hace la petición es el mismo del comentario
            if (req.userId !== commentUserId) {
                return res.status(403).json({ message: 'No tienes permisos para actualizar esta publicación.' });
            }
            // Actualizar la publicación
            await commentRepliesCollectionRef.update({
                content, // Usar el nombre correcto del campo "timestamp"
            });
        }else{
            // Obtener el userID del documento de la publicación
            const commentUserId = commentDoc.data().userId;
            // Verificar si el usuario que hace la petición es el mismo del comentario
            if (req.userId !== commentUserId) {
                return res.status(403).json({ message: 'No tienes permisos para actualizar esta publicación.' });
            }
            // Crear un objeto de fecha y hora usando Timestamp
            const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());
            // Actualizar la publicación
            await commentCollectionRef.update({
                content, // Usar el nombre correcto del campo "timestamp"
            });
        }

        res.status(200).json({ message: 'Comentario actualizado correctamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al actualizar el comentario.' });
    }
}
export const deleteCommentById = async (req, res) => {
    try {
        console.log("req.params.commentId: ", req.params.commentId);
        const commentCollectionRef = dbAdmin.collection("comments").doc(req.params.commentId);        
        // Obtener la información de la publicación
        const commentDoc = await commentCollectionRef.get();
        // Verificar si la publicación existe
        if (!commentDoc.exists) {
            const commentRepliesCollectionRef = dbAdmin.collection("commentReplies").doc(req.params.commentId);
            const commentRepliesDoc = await commentRepliesCollectionRef.get();
            if(!commentRepliesDoc.exists){
                return res.status(404).json({ message: 'El comentario con el ID proporcionado no existe.' });
            }
            const commentUserId = commentRepliesDoc.data().userId;
            // Verificar si el usuario que hace la petición es el mismo que comenta
            if (req.userId !== commentUserId) {
                console.log("commentUserId: ", commentUserId, " req.userId: ", req.userId);            
                return res.status(403).json({ message: 'No tienes permisos para eliminar este comentario' });
            }
            // Eliminar comentario
            await commentRepliesCollectionRef.delete();
        }else{
            // Obtener el userID del documento de la publicación
            const commentUserId = commentDoc.data().userId;
            // Verificar si el usuario que hace la petición es el mismo que comenta
            if (req.userId !== commentUserId) {
                console.log("commentUserId: ", commentUserId, " req.userId: ", req.userId);            
                return res.status(403).json({ message: 'No tienes permisos para eliminar este comentario' });
            }
            // Eliminar comentario
            await commentCollectionRef.delete();
        }
        res.status(200).json({ message: 'comentario eliminado correctamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar el comentario.' });
    }
};