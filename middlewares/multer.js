import multer from "multer";
import {v4 as uuid} from 'uuid';

const storage = multer.diskStorage({
    destination(req,file,cb){
        cb(null,"uploads")
    },
    filename(req, file, cb){
        const id = uuid();

        const extName = file.originalname.split(".").pop();

        const filename = `${id}.${extName}`;
        console.log(filename);

        cb(null, filename);

    }
});

export const uploadFiles  = multer({ storage }).single("file");

