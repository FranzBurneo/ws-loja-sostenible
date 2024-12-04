import { getStorage, ref, getDownloadURL } from "firebase/storage";

const storage = getStorage();

export const getImgByname = async (req, res) => {
    try {
        console.log('req.body.imgName: ', req.body.imgName);
        const url = await getDownloadURL(ref(storage, req.body.imgName));
        console.log('img: ', url);
        res.status(200).json({ message: 'ok', url });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.', error });
    }
};
